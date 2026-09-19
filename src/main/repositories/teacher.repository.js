// src/main/repositories/teacher.repository.js
import { BaseRepository } from './base.repository.js'
import { teacher } from '../db/index.js'
import { sql,count,eq,and } from 'drizzle-orm'

export class TeacherRepository extends BaseRepository {
  constructor() {
    super(teacher, ['firstName', 'lastName', 'phone', 'email'])
  }

  async findActive() {
    return this.findAll({ where: { isActive: true } })
  }

  async findWithModules(teacherId) {
    const { module_ } = await import('../db/index.js')
    const db = this.db()
    
    return await db
      .select()
      .from(module_)
      .where(eq(module_.teacherId, teacherId))
      .where(eq(module_.isActive, true))
  }

async getTeacherStats(teacherId) {
  const { module_, session, teacherAttendance } = await import('../db/index.js');
  const db = this.db();

  const modulesResult = await db
    .select({ count: count() })
    .from(module_)
    .where(and(eq(module_.teacherId, teacherId), eq(module_.isActive, true)));
  const totalModules = Number(modulesResult[0]?.count || 0);

  const sessionsResult = await db
    .select({ count: count() })
    .from(session)
    .where(eq(session.teacherId, teacherId));
  const totalSessions = Number(sessionsResult[0]?.count || 0);

  const attendanceResult = await db
    .select({
      total: sql`count(*)`.as('total'),
      present: sql`sum(case when ${teacherAttendance.status} = 'present' then 1 else 0 end)`.as('present')
    })
    .from(teacherAttendance)
    .where(eq(teacherAttendance.teacherId, teacherId));

  const totalAttendance = Number(attendanceResult[0]?.total || 0);
  const presentAttendance = Number(attendanceResult[0]?.present || 0);
  const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;

  return {
    totalModules,
    totalSessions,
    totalAttendance,
    presentAttendance,
    attendanceRate,
  };
}
}