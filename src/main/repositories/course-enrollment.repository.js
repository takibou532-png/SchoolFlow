// src/main/repositories/course-enrollment.repository.js
import { BaseRepository } from './base.repository.js';
import { courseEnrollment } from '../db/index.js';
import { eq, and, sql,count } from 'drizzle-orm';

export class CourseEnrollmentRepository extends BaseRepository {
  constructor() {
    super(courseEnrollment);
  }

  async findActiveByCourse(courseId) {
    const db = this.db();
    return await db
      .select()
      .from(courseEnrollment)
      .where(
        and(
          eq(courseEnrollment.courseId, courseId),
          eq(courseEnrollment.isActive, true)
        )
      );
  }

  async findByStudentAndCourse(studentId, courseId) {
    const db = this.db();
    const result = await db
      .select()
      .from(courseEnrollment)
      .where(
        and(
          eq(courseEnrollment.studentId, studentId),
          eq(courseEnrollment.courseId, courseId),
          eq(courseEnrollment.isActive, true)
        )
      )
      .limit(1);
    return result[0] || null;
  }
async countActiveByCourse(courseId) {
  const db = this.db();
  const result = await db
    .select({ count: count() })
    .from(courseEnrollment)
    .where(and(eq(courseEnrollment.courseId, courseId), eq(courseEnrollment.isActive, true)));
  return Number(result[0]?.count || 0);
}


}