// src/main/repositories/classroom.repository.js
import { BaseRepository } from './base.repository.js'
import { classroom } from '../db/index.js'
import { sql,eq } from 'drizzle-orm';

export class ClassroomRepository extends BaseRepository {
  constructor() {
    super(classroom, ['name'])
  }

async findAvailable() {
  const { module_ } = await import('../db/index.js');
  const db = this.db();
  // Using having clause to filter classrooms where module count < capacity
  const rows = await db
    .select({
      classroom: classroom,
      moduleCount: sql`count(${module_.id})`.as('moduleCount')
    })
    .from(classroom)
    .leftJoin(module_, eq(classroom.id, module_.classroomId))
    .groupBy(classroom.id)
    .having(sql`count(${module_.id}) < ${classroom.capacity}`);
  return rows;
}
}