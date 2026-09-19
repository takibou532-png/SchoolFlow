// src/main/repositories/course-attendance.repository.js
import { BaseRepository } from './base.repository.js';
import { courseAttendance } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export class CourseAttendanceRepository extends BaseRepository {
  constructor() {
    super(courseAttendance);
  }

  async findBySession(courseSessionId) {
    const db = this.db();
    return await db
      .select()
      .from(courseAttendance)
      .where(eq(courseAttendance.courseSessionId, courseSessionId));
  }

  async findByStudentAndCourse(studentId, courseId) {
    const db = this.db();
    // Join with course_session to get all sessions for this course
    return await db
      .select({
        session: courseSession,
        attendance: courseAttendance
      })
      .from(courseSession)
      .leftJoin(
        courseAttendance,
        and(
          eq(courseAttendance.courseSessionId, courseSession.id),
          eq(courseAttendance.studentId, studentId)
        )
      )
      .where(eq(courseSession.courseId, courseId))
      .orderBy(courseSession.date, 'asc')
      .orderBy(courseSession.startTime, 'asc');
  }
}