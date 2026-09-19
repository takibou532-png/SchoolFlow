import { BaseService } from './base.service.js';
import { 
  CourseAttendanceRepository,
  CourseSessionRepository,
  CourseEnrollmentRepository,
  StudentRepository,
  CourseRepository
} from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { courseAttendance } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { CoursePaymentService } from './course-payment.service.js';

export class CourseAttendanceService extends BaseService {
  constructor() {
    super();
    this.attendanceRepo = new CourseAttendanceRepository();
    this.sessionRepo = new CourseSessionRepository();
    this.enrollmentRepo = new CourseEnrollmentRepository();
    this.studentRepo = new StudentRepository();
    this.courseRepo = new CourseRepository();
    this.coursePaymentSerice =new CoursePaymentService();
  }

  // ─── GET COURSE ATTENDANCE SHEET ──────────────────
  /**
   * Get all students enrolled in the course with their current attendance status
   * @param {number} courseSessionId
   */
  async getCourseAttendanceSheet(courseSessionId) {
    const db = getDb();

    // 1. Validate session exists
    const session = await this.sessionRepo.findById(courseSessionId);
    if (!session) throw new Error('Course session not found');

    // 2. Get course
    const course = await this.courseRepo.findById(session.courseId);
    if (!course) throw new Error('Course not found');

    // 3. Get all active enrollments for this course
    const enrollments = await this.enrollmentRepo.findActiveByCourse(course.id);
    if (enrollments.length === 0) {
      return {
        session: session,
        course: course,
        students: []
      };
    }

    // 4. Build student list with attendance status
    const studentsWithStatus = [];
    for (const enrollment of enrollments) {
      const student = await this.studentRepo.findById(enrollment.studentId);
      if (!student || !student.isActive) continue;

      // Check if attendance already recorded
      const attendanceRecord = await db
        .select()
        .from(courseAttendance)
        .where(
          and(
            eq(courseAttendance.courseSessionId, courseSessionId),
            eq(courseAttendance.studentId, student.id)
          )
        )
        .limit(1);

      studentsWithStatus.push({
        student: student,
        enrollmentId: enrollment.id,
        status: attendanceRecord.length > 0 ? attendanceRecord[0].status : null,
        recordedAt: attendanceRecord.length > 0 ? attendanceRecord[0].recordedAt : null
      });
    }

    // Sort by lastName, firstName
    studentsWithStatus.sort((a, b) => {
      if (a.student.lastName < b.student.lastName) return -1;
      if (a.student.lastName > b.student.lastName) return 1;
      if (a.student.firstName < b.student.firstName) return -1;
      if (a.student.firstName > b.student.firstName) return 1;
      return 0;
    });

    return {
      session: session,
      course: course,
      students: studentsWithStatus
    };
  }

// ─── MARK COURSE ATTENDANCE ──────────────────────
/**
 * Bulk mark attendance for a course session
 * @param {number} courseSessionId
 * @param {Array} attendanceList - [{ studentId, status }]
 */
async markCourseAttendance(courseSessionId, attendanceList) {
  const db = getDb();
  console.log('[markCourseAttendance] START', { courseSessionId, attendanceList });

  // 1. Validate session exists and is not cancelled
  const session = await this.sessionRepo.findById(courseSessionId);
  console.log('[markCourseAttendance] CHECKPOINT 1 - session:', session);
  if (!session) throw new Error('Course session not found');
  if (session.status === 'cancelled') {
    throw new Error('Cannot mark attendance for cancelled session');
  }

  // 2. Get course and active enrollments
  const course = await this.courseRepo.findById(session.courseId);
  console.log('[markCourseAttendance] CHECKPOINT 2 - course:', course);
  if (!course) throw new Error('Course not found');

  const enrollments = await this.enrollmentRepo.findActiveByCourse(course.id);
  console.log('[markCourseAttendance] CHECKPOINT 3 - enrollments:', enrollments);
  const validStudentIds = enrollments.map(e => e.studentId);
  console.log('[markCourseAttendance] validStudentIds:', validStudentIds);

  // 3. Validate each student
  const errors = [];
  const toUpsert = [];

  for (const item of attendanceList) {
    const { studentId, status } = item;
    if (!validStudentIds.includes(studentId)) {
      errors.push({ studentId, error: 'Student not enrolled or inactive' });
      continue;
    }
    if (!['present', 'absent'].includes(status)) {
      errors.push({ studentId, error: 'Invalid status. Must be "present" or "absent"' });
      continue;
    }
    toUpsert.push({ studentId, status });
  }

  console.log('[markCourseAttendance] CHECKPOINT 4 - toUpsert:', toUpsert, 'errors:', errors);

  if (toUpsert.length === 0) {
    throw new Error('No valid attendance records to mark');
  }

  // 4. Upsert attendance in transaction (synchronous — no await inside, no await on db.transaction itself)
  console.log('[markCourseAttendance] CHECKPOINT 5 - entering transaction');

  const result = db.transaction(() => {
    console.log('[markCourseAttendance] CHECKPOINT 6 - inside transaction');
    const updatedRecords = [];

    for (const { studentId, status } of toUpsert) {
      const recordedAt = new Date().toISOString();
      console.log('[markCourseAttendance] LOOP - building query for', { courseSessionId, studentId, status, recordedAt });

      const q = db
        .insert(courseAttendance)
        .values({
          courseSessionId: courseSessionId,
          studentId: studentId,
          status: status,
          recordedAt: recordedAt
        })
        .onConflictDoUpdate({
          target: [courseAttendance.courseSessionId, courseAttendance.studentId],
          set: { status: status, recordedAt: recordedAt }
        })
        .returning();

      console.log('[markCourseAttendance] LOOP - query built, calling toSQL()');

      try {
        const compiled = q.toSQL();
        console.log('[markCourseAttendance] SQL DEBUG:', JSON.stringify(compiled, null, 2));
      } catch (sqlErr) {
        console.log('[markCourseAttendance] toSQL() ITSELF THREW:', sqlErr.message);
      }

      console.log('[markCourseAttendance] LOOP - calling .get()');
      const inserted = q.get();
      console.log('[markCourseAttendance] LOOP - .get() result:', inserted);

      updatedRecords.push(inserted);
    }

    console.log('[markCourseAttendance] CHECKPOINT 7 - transaction loop done, updatedRecords:', updatedRecords);
    return { updated: updatedRecords.length, errors: errors };
  });

  console.log('[markCourseAttendance] CHECKPOINT 8 - transaction result:', result);

  return {
    updated: result.updated,
    errors: result.errors
  };
}

  // ─── GET STUDENT COURSE ATTENDANCE ──────────────
  /**
   * Get all attendance records for a student in a specific course
   * @param {number} studentId
   * @param {number} courseId
   */
  async getStudentCourseAttendance(studentId, courseId) {
    const db = getDb();

    // 1. Validate student
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw new Error('Student not found');

    // 2. Validate course
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new Error('Course not found');

    // 3. Check enrollment
    const enrollment = await this.enrollmentRepo.findByStudentAndCourse(studentId, courseId);
    if (!enrollment) throw new Error('Student is not enrolled in this course');

    // 4. Get all sessions for this course
    const sessions = await this.sessionRepo.findByCourse(courseId);

    // 5. Get attendance for each session
    const sessionAttendances = [];
    for (const sess of sessions) {
      const attendance = await db
        .select()
        .from(courseAttendance)
        .where(
          and(
            eq(courseAttendance.courseSessionId, sess.id),
            eq(courseAttendance.studentId, studentId)
          )
        )
        .limit(1);

      sessionAttendances.push({
        session: sess,
        attendance: attendance.length > 0 ? attendance[0] : null
      });
    }

    // 6. Compute summary
    const total = sessionAttendances.length;
    const presentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'present').length;
    const absentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'absent').length;
    const notMarked = total - presentCount - absentCount;
    const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      student: student,
      course: course,
      enrollment: enrollment,
      sessions: sessionAttendances,
      summary: {
        totalSessions: total,
        present: presentCount,
        absent: absentCount,
        notMarked: notMarked,
        attendanceRate: parseFloat(attendanceRate.toFixed(2))
      }
    };
  }

  // ─── GET COURSE ATTENDANCE REPORT ────────────────
  /**
   * Get attendance report for the entire course (all students)
   * @param {number} courseId
   */
  async getCourseAttendanceReport(courseId) {
    const db = getDb();

    // 1. Validate course
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new Error('Course not found');

    // 2. Get all sessions
    const sessions = await this.sessionRepo.findByCourse(courseId);
    if (sessions.length === 0) {
      return {
        course: course,
        students: [],
        summary: {
          totalStudents: 0,
          totalSessions: 0
        }
      };
    }

    // 3. Get all active enrollments
    const enrollments = await this.enrollmentRepo.findActiveByCourse(courseId);
    if (enrollments.length === 0) {
      return {
        course: course,
        students: [],
        summary: {
          totalStudents: 0,
          totalSessions: sessions.length
        }
      };
    }

    // 4. For each student, calculate attendance
    const studentReports = [];
    for (const enrollment of enrollments) {
      const student = await this.studentRepo.findById(enrollment.studentId);
      if (!student || !student.isActive) continue;

      const sessionAttendances = [];
      let presentCount = 0;
      let absentCount = 0;
      let notMarked = 0;

      for (const sess of sessions) {
        const attendance = await db
          .select()
          .from(courseAttendance)
          .where(
            and(
              eq(courseAttendance.courseSessionId, sess.id),
              eq(courseAttendance.studentId, student.id)
            )
          )
          .limit(1);

        const status = attendance.length > 0 ? attendance[0].status : null;
        sessionAttendances.push({
          session: sess,
          status: status
        });

        if (status === 'present') presentCount++;
        else if (status === 'absent') absentCount++;
        else notMarked++;
      }

      const total = sessionAttendances.length;
      const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

      studentReports.push({
        student: student,
        enrollmentId: enrollment.id,
        sessions: sessionAttendances,
        summary: {
          totalSessions: total,
          present: presentCount,
          absent: absentCount,
          notMarked: notMarked,
          attendanceRate: parseFloat(attendanceRate.toFixed(2))
        }
      });
    }

    return {
      course: course,
      sessions: sessions,
      students: studentReports,
      summary: {
        totalStudents: studentReports.length,
        totalSessions: sessions.length
      }
    };
  }
}