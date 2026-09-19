// src/main/repositories/module.repository.js
import { BaseRepository } from './base.repository.js'
import { module_ } from '../db/index.js'
import { eq, and, between, or, sql } from 'drizzle-orm'

export class ModuleRepository extends BaseRepository {
  constructor() {
    super(module_, ['name'])
  }

  async findActive() {
    return this.findAll({ where: { isActive: true } })
  }

  async findByTeacher(teacherId) {
    return this.findAll({ where: { teacherId, isActive: true } })
  }

  async findBySubject(subjectId) {
    return this.findAll({ where: { subjectId, isActive: true } })
  }

  async findByClassroom(classroomId) {
    return this.findAll({ where: { classroomId, isActive: true } })
  }

  async findWithDetails(moduleId) {
    const { subject, teacher, classroom, enrollment } = await import('../db/index.js')
    const db = this.db()

    const result = await db
      .select({
        module: module_,
        subject: subject,
        teacher: teacher,
        classroom: classroom,
        studentCount: sql`count(${enrollment.id})`
      })
      .from(module_)
      .where(eq(module_.id, moduleId))
      .leftJoin(subject, eq(module_.subjectId, subject.id))
      .leftJoin(teacher, eq(module_.teacherId, teacher.id))
      .leftJoin(classroom, eq(module_.classroomId, classroom.id))
      .leftJoin(enrollment, eq(module_.id, enrollment.moduleId))
      .groupBy(module_.id)

    return result[0] || null
  }

  async getModuleStudents(moduleId) {
    const { student, enrollment } = await import('../db/index.js')
    const db = this.db()

    return await db
      .select({
        student: student,
        enrolledAt: enrollment.enrolledAt,
        isActive: enrollment.isActive
      })
      .from(enrollment)
      .leftJoin(student, eq(enrollment.studentId, student.id))
      .where(and(eq(enrollment.moduleId, moduleId), eq(enrollment.isActive, true)))
  }

  async getModuleSessions(moduleId) {
    const { session } = await import('../db/index.js')
    const db = this.db()

    return await db
      .select()
      .from(session)
      .where(eq(session.moduleId, moduleId))
      .orderBy(session.date, 'asc')
      .orderBy(session.startTime, 'asc')
  }

  async findAllWithDetails(options = {}) {
    const db = this.db();
    const { subject, teacher, enrollment } = await import('../db/index.js');
    let query = db
      .select({
        id: module_.id,
        name: module_.name,
        level: module_.level,
        subjectId: module_.subjectId,
        teacherId: module_.teacherId,
        startDate: module_.startDate,
        endDate: module_.endDate,
        monthlyPrice: module_.monthlyPrice,
        sessionPrice: module_.sessionPrice,
        sessionsPerMonth: module_.sessionsPerMonth,
        isActive: module_.isActive,
        createdAt: module_.createdAt,
        subjectName: subject.name,
        teacherFirstName: teacher.firstName,
        teacherLastName: teacher.lastName,
        studentCount: sql`count(${enrollment.id})`
      })
      .from(module_)
      .leftJoin(subject, eq(module_.subjectId, subject.id))
      .leftJoin(teacher, eq(module_.teacherId, teacher.id))
      .leftJoin(enrollment, eq(module_.id, enrollment.moduleId))
      .groupBy(module_.id);

    // Apply search and filters
    // ... (we'll keep it simple for now)

    return await query;
  }

  // ─── MONTHLY / CYCLE REVENUE FOR A MODULE ───────
  // Sums invoices belonging to enrollments of this module.
  async getMonthlyRevenue(moduleId) {
    const { enrollment, invoice } = await import('../db/index.js')
    const db = this.db()

    const result = await db
      .select({
        total: sql`sum(${invoice.amount})`,
        paid: sql`sum(case when ${invoice.status} = 'paid' then ${invoice.amount} else 0 end)`
      })
      .from(invoice)
      .leftJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
      .where(eq(enrollment.moduleId, moduleId))

    return {
      total: Number(result[0]?.total || 0),
      paid: Number(result[0]?.paid || 0),
      pending: Number(result[0]?.total || 0) - Number(result[0]?.paid || 0)
    }
  }
}