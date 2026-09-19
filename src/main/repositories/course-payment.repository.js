// src/main/repositories/course-payment.repository.js
import { BaseRepository } from './base.repository.js';
import { coursePayment } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export class CoursePaymentRepository extends BaseRepository {
  constructor() {
    super(coursePayment);
  }

  async findPendingByTeacher(teacherId) {
    const db = this.db();
    return await db
      .select()
      .from(coursePayment)
      .where(
        and(
          eq(coursePayment.teacherId, teacherId),
          eq(coursePayment.status, 'pending')
        )
      );
  }

  async findPendingByCourse(courseId) {
    const db = this.db();
    return await db
      .select()
      .from(coursePayment)
      .where(
        and(
          eq(coursePayment.courseId, courseId),
          eq(coursePayment.status, 'pending')
        )
      );
  }

  async findByTeacher(teacherId) {
    const db = this.db();
    return await db
      .select()
      .from(coursePayment)
      .where(eq(coursePayment.teacherId, teacherId))
      .orderBy(coursePayment.createdAt, 'desc');
  }


  async findByCourse(courseId) {
  const db = this.db();
  return await db
    .select()
    .from(coursePayment)
    .where(eq(coursePayment.courseId, courseId));
}
}