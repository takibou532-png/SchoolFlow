import { BaseService } from './base.service.js';
import { CourseRepository, CourseSessionRepository, TeacherRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { courseSession ,coursePayment,courseEnrollment,courseAttendance, invoice,teacher,course} from '../db/index.js';
import { eq, and, gte, asc,sql } from 'drizzle-orm';

export class CourseService extends BaseService {
  constructor() {
    super(new CourseRepository());
    this.sessionRepo = new CourseSessionRepository();
    this.teacherRepo = new TeacherRepository();
  }



/**
 * @param {Object} dto
 * @param {string} dto.name
 * @param {string} dto.subjectName
 * @param {string} dto.level - optional
 * @param {number} dto.maxStudents - optional
 * @param {number} dto.teacherId - required (internal teacher)
 * @param {number} dto.totalPrice
 * @param {number} dto.sessionPrice
 * @param {string} dto.startDate - YYYY-MM-DD
 * @param {string} dto.endDate - YYYY-MM-DD
 * @param {Array} dto.sessions - [{ date, startTime, endTime }]
 */
async createCourseWithSessions(dto) {
  // 1. Validate required fields
  const required = ['name', 'subjectName', 'teacherId', 'totalPrice', 'sessionPrice', 'startDate', 'endDate', 'sessions'];
  for (const field of required) {
    if (dto[field] === undefined || dto[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // 2. Validate teacher exists and is active
  const teacher = await this.teacherRepo.findById(dto.teacherId);
  if (!teacher) throw new Error('Teacher not found');
  if (!teacher.isActive) throw new Error('Teacher is not active');

  // 3. Validate dates
  const start = new Date(dto.startDate);
  const end = new Date(dto.endDate);
  if (isNaN(start) || isNaN(end) || start > end) {
    throw new Error('Invalid date range: startDate must be before endDate');
  }

  // 4. Validate sessions
  if (!Array.isArray(dto.sessions) || dto.sessions.length === 0) {
    throw new Error('At least one session is required');
  }

  const sessionEntries = [];
  const sessionDates = new Set();
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  for (let i = 0; i < dto.sessions.length; i++) {
    const s = dto.sessions[i];
    if (!s.date || !s.startTime || !s.endTime) {
      throw new Error(`Session at index ${i}: date, startTime, and endTime are required`);
    }

    const sessionDate = new Date(s.date);
    if (isNaN(sessionDate)) {
      throw new Error(`Session at index ${i}: invalid date format`);
    }
    if (sessionDate < start || sessionDate > end) {
      throw new Error(`Session at index ${i}: date must be between ${dto.startDate} and ${dto.endDate}`);
    }

    if (!timeRegex.test(s.startTime) || !timeRegex.test(s.endTime)) {
      throw new Error(`Session at index ${i}: invalid time format (use HH:mm)`);
    }
    if (s.startTime >= s.endTime) {
      throw new Error(`Session at index ${i}: startTime must be before endTime`);
    }

    const key = `${s.date}|${s.startTime}|${s.endTime}`;
    if (sessionDates.has(key)) {
      throw new Error(`Duplicate session: ${s.date} ${s.startTime}-${s.endTime}`);
    }
    sessionDates.add(key);

    sessionEntries.push({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      sessionIndex: i + 1
    });
  }

  // 5. Sort sessions by date then time
  sessionEntries.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });

  sessionEntries.forEach((s, idx) => {
    s.sessionIndex = idx + 1;
  });

  // 6. Insert course and sessions in a transaction
  // IMPORTANT: better-sqlite3 transactions must be fully synchronous.
  // We use .get() / .all() (Drizzle's sync accessors) instead of await here.
  const db = getDb();

  const result = db.transaction(() => {
    const courseData = {
      name: dto.name,
      subjectName: dto.subjectName,
      level: dto.level || null,
      maxStudents: dto.maxStudents || null,
      teacherId: dto.teacherId,
      totalPrice: dto.totalPrice,
      sessionPrice: dto.sessionPrice,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const newCourse = db
      .insert(this.repository.table)   // your courses table
      .values(courseData)
      .returning()
      .get();

    const sessionsWithCourse = sessionEntries.map(s => ({
      ...s,
      courseId: newCourse.id,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }));

    const insertedSessions = db
      .insert(this.sessionRepo.table)  // your sessions table (e.g. `session`)
      .values(sessionsWithCourse)
      .returning()
      .all();

    return { course: newCourse, sessions: insertedSessions };
  });

  return result;
}

  // src/main/services/course.service.js

// ─── ARCHIVE COURSE ──────────────────────────────
/**
 * Archive a course: deactivate it and all its sessions.
 * Used after course completion or at the end of the session.
 * @param {number} courseId
 */
async archiveCourse(courseId) {
  const db = getDb();

  // 1. Check course exists and is active
  const course = await this.repository.findById(courseId);
  if (!course) throw new Error('Course not found');
  if (!course.isActive) throw new Error('Course is already archived');

  // 2. In transaction
  return await db.transaction(() => {
    // Deactivate course
    const updatedCourse = this.repository.update(courseId, {
      isActive: false
    });

    // Deactivate ALL sessions (not just future)
    db
      .update(courseSession)
      .set({ status: 'cancelled' })
      .where(eq(courseSession.courseId, courseId))
      .run();

    return updatedCourse;
  });
}




async cancelCourse(courseId, reason = null) {
  const db = getDb();

  const course = await this.repository.findById(courseId);
  if (!course) throw new Error('Course not found');
  if (!course.isActive) throw new Error('Course is already archived');

  const today = new Date().toISOString().split('T')[0];
  if (course.startDate <= today) {
    throw new Error('Cannot cancel a course that has already started or is in progress');
  }

  const sessions = await this.sessionRepo.findByCourse(courseId);
  const pastSessions = sessions.filter(s => s.date < today);
  if (pastSessions.length > 0) {
    throw new Error(`Cannot cancel: ${pastSessions.length} session(s) have already passed`);
  }

  return db.transaction(() => {
    // a. Get all course enrollments
    const enrollments = db
      .select()
      .from(courseEnrollment)
      .where(eq(courseEnrollment.courseId, courseId))
      .all();

    // b. For each enrollment, delete its invoices
    for (const enrollment of enrollments) {
      const invoices = db
        .select()
        .from(invoice)
        .where(eq(invoice.courseEnrollmentId, enrollment.id))
        .all();

      for (const inv of invoices) {
        db.delete(invoice).where(eq(invoice.id, inv.id)).run();
      }
    }

    // c. Delete course enrollments
    db.delete(courseEnrollment)
      .where(eq(courseEnrollment.courseId, courseId))
      .run();

    // d. Delete course payments (wipes everything — nothing has happened yet, no reconciliation needed)
    db.delete(coursePayment)
      .where(eq(coursePayment.courseId, courseId))
      .run();

    // e. Delete course sessions
    db.delete(courseSession)
      .where(eq(courseSession.courseId, courseId))
      .run();

    // f. Delete course
    const deleted = this.repository.delete(courseId); // sync now

    return {
      courseId: courseId,
      deleted: !!deleted,
      reason: reason || 'Course cancelled'
    };
  }); // no await — db.transaction() is sync, returns the value directly
}



  // ─── UPDATE COURSE (BASIC INFO) ──────────────────
  /**
   * Update course basic info (name, subject, level, maxStudents, etc.)
   * Cannot update teacher, price, or dates after creation (to keep session consistency).
   */
  async updateCourse(courseId, data) {
    const course = await this.repository.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (!course.isActive) throw new Error('Cannot update archived course');

    // Allowed fields
    const allowed = ['name', 'subjectName', 'level', 'maxStudents'];
    const updateData = {};
    for (const field of allowed) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    return this.repository.update(courseId, updateData);
  }

  // ─── GET COURSE WITH SESSIONS ────────────────────
 async getCourseWithSessions(courseId) {
  const db = getDb();

  // ─── Get course with teacher info ──────────────
  const courseResult = await db
    .select({
      id: course.id,
      name: course.name,
      subjectName: course.subjectName,
      level: course.level,
      maxStudents: course.maxStudents,
      teacherId: course.teacherId,
      teacherFirstName: teacher.firstName,
      teacherLastName: teacher.lastName,
      totalPrice: course.totalPrice,
      sessionPrice: course.sessionPrice,
      startDate: course.startDate,
      endDate: course.endDate,
      isActive: course.isActive,
      createdAt: course.createdAt,
    })
    .from(course)
    .leftJoin(teacher, eq(course.teacherId, teacher.id))
    .where(eq(course.id, courseId))
    .limit(1);

  if (!courseResult || courseResult.length === 0) {
    throw new Error('Course not found');
  }

  const courseData = courseResult[0];

  // ─── Get sessions ──────────────────────────────
  const sessions = await db
    .select()
    .from(courseSession)
    .where(eq(courseSession.courseId, courseId))
    .orderBy(asc(courseSession.date), asc(courseSession.startTime));

  // ─── Build response ────────────────────────────
  return {
    ...courseData,
    teacherName: courseData.teacherFirstName && courseData.teacherLastName
      ? `${courseData.teacherFirstName} ${courseData.teacherLastName}`
      : null,
    sessions,
  };
}

  // ─── GET ALL COURSES ─────────────────────────────
 async getAllCourses(options = {}) {
  const db = getDb();
  const { search } = options;

  let query = db
    .select({
      id: course.id,
      name: course.name,
      subjectName: course.subjectName,
      level: course.level,
      maxStudents: course.maxStudents,
      teacherId: course.teacherId,
      teacherFirstName: teacher.firstName,
      teacherLastName: teacher.lastName,
      totalPrice: course.totalPrice,
      sessionPrice: course.sessionPrice,
      startDate: course.startDate,
      endDate: course.endDate,
      isActive: course.isActive,
      createdAt: course.createdAt,
    })
    .from(course)
    .leftJoin(teacher, eq(course.teacherId, teacher.id))
    .where(eq(course.isActive, true));

  if (search) {
    const term = `%${search}%`;
    query = query.where(sql`${course.name} LIKE ${term} OR ${course.subjectName} LIKE ${term}`);
  }

  const results = await query;
  return results.map(r => ({
    ...r,
    teacherName: r.teacherFirstName && r.teacherLastName
      ? `${r.teacherFirstName} ${r.teacherLastName}`
      : null,
  }));
}

  // ─── GET COURSE SESSIONS (DTO) ─────────────────────
/**
 * Get all sessions for a course as plain DTO objects.
 * @param {number} courseId
 * @returns {Promise<Array>} Array of session objects
 */
async getSessions(courseId) {
  const db = getDb();
  return db
    .select()
    .from(courseSession)
    .where(eq(courseSession.courseId, courseId))
    .orderBy(asc(courseSession.date), asc(courseSession.startTime));
}
}