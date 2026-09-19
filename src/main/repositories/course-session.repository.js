// src/main/repositories/course-session.repository.js
import { BaseRepository } from './base.repository.js';
import { courseSession } from '../db/index.js';
import { eq, and, gte, lte } from 'drizzle-orm';

export class CourseSessionRepository extends BaseRepository {
  constructor() {
    super(courseSession);
  }

  async findByCourse(courseId) {
    return this.findAll({
      where: { courseId },
      orderBy: 'date',
      orderDir: 'asc'
    });
  }

  async findFutureByCourse(courseId, fromDate) {
    const db = this.db();
    return await db
      .select()
      .from(courseSession)
      .where(
        and(
          eq(courseSession.courseId, courseId),
          gte(courseSession.date, fromDate)
        )
      )
      .orderBy(courseSession.date, 'asc')
      .orderBy(courseSession.startTime, 'asc');
  }

  async bulkCreate(sessionsData) {
  if (sessionsData.length === 0) return [];
  const db = this.db();
  const result = await db.insert(courseSession).values(sessionsData).returning();
  return result;
}
}