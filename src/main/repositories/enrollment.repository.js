// src/main/repositories/enrollment.repository.js
import { BaseRepository } from './base.repository.js';
import { enrollment } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export class EnrollmentRepository extends BaseRepository {
  constructor() {
    super(enrollment);
  }

  async findActiveByModule(moduleId) {
    const db = this.db();
    return await db
      .select()
      .from(enrollment)
      .where(
        and(
          eq(enrollment.moduleId, moduleId),
          eq(enrollment.isActive, true)
        )
      );
  }

  async findByStudentAndModule(studentId, moduleId) {
    const db = this.db();
    const result = await db
      .select()
      .from(enrollment)
      .where(
        and(
          eq(enrollment.studentId, studentId),
          eq(enrollment.moduleId, moduleId),
          eq(enrollment.isActive, true)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // ✅ Override create to ensure it returns the row with id
async create(data) {
  const db = this.db();
  const cleanData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  const result = await db.insert(this.table).values(cleanData).returning();
  // ✅ result is an array of rows; return the first one
  return result[0] || null;
}
}