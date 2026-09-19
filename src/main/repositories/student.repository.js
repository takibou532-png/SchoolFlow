// src/main/repositories/student.repository.js
import { BaseRepository } from './base.repository.js'
import { student } from '../db/index.js'
import { eq, sql,and,count } from 'drizzle-orm'

export class StudentRepository extends BaseRepository {
  constructor() {
    super(student, ['firstName', 'lastName', 'guardianName', 'guardianPhone'])
  }

  async findActive() {
    return this.findAll({ where: { isActive: true } })
  }

  async findWithEnrollments(studentId) {
    const { enrollment, module_, subject, teacher, classroom } = await import('../db/index.js')
    const db = this.db()
    
    return await db
      .select({
        enrollment: enrollment,
        module: module_,
        subject: subject,
        teacher: teacher,
        classroom: classroom
      })
      .from(enrollment)
      .where(eq(enrollment.studentId, studentId))
      .where(eq(enrollment.isActive, true))
      .leftJoin(module_, eq(enrollment.moduleId, module_.id))
      .leftJoin(subject, eq(module_.subjectId, subject.id))
      .leftJoin(teacher, eq(module_.teacherId, teacher.id))
      .leftJoin(classroom, eq(module_.classroomId, classroom.id))
  }

  async getStudentAttendance(studentId) {
    const { studentAttendance, session } = await import('../db/index.js')
    const db = this.db()
    
    const attendance = await db
      .select({
        session: session,
        status: studentAttendance.status,
        recordedAt: studentAttendance.recordedAt
      })
      .from(studentAttendance)
      .where(eq(studentAttendance.studentId, studentId))
      .leftJoin(session, eq(studentAttendance.sessionId, session.id))
      .orderBy(session.date, 'desc')
    
    return attendance
  }

async getStudentStats(studentId) {
  const { enrollment, studentAttendance, invoice } = await import('../db/index.js');
  const db = this.db();

  const enrollmentsResult = await db
    .select({ count: count() })
    .from(enrollment)
    .where(and(eq(enrollment.studentId, studentId), eq(enrollment.isActive, true)));
  const activeEnrollments = Number(enrollmentsResult[0]?.count || 0);

  const attendanceResult = await db
    .select({
      total: sql`count(*)`.as('total'),
      present: sql`sum(case when ${studentAttendance.status} = 'present' then 1 else 0 end)`.as('present')
    })
    .from(studentAttendance)
    .where(eq(studentAttendance.studentId, studentId));
  const totalAttendance = Number(attendanceResult[0]?.total || 0);
  const presentAttendance = Number(attendanceResult[0]?.present || 0);
  const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;

  const invoiceResult = await db
    .select({
      total: sql`count(*)`.as('total'),
      paid: sql`sum(case when ${invoice.status} = 'paid' then 1 else 0 end)`.as('paid'),
      totalAmount: sql`sum(${invoice.amount})`.as('totalAmount'),
      paidAmount: sql`sum(case when ${invoice.status} = 'paid' then ${invoice.amount} else 0 end)`.as('paidAmount')
    })
    .from(invoice)
    .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
    .where(eq(enrollment.studentId, studentId));

  return {
    activeEnrollments,
    totalAttendance,
    presentAttendance,
    attendanceRate,
    invoiceStats: {
      total: Number(invoiceResult[0]?.total || 0),
      paid: Number(invoiceResult[0]?.paid || 0),
      totalAmount: Number(invoiceResult[0]?.totalAmount || 0),
      paidAmount: Number(invoiceResult[0]?.paidAmount || 0),
    }
  };
}
}