// src/main/services/attendance.service.js
import { BaseService } from './base.service.js';
import { session, enrollment, module_ ,teacher,payment,paymentInvoice} from '../db/index.js';
import { StudentRepository, EnrollmentRepository, SessionRepository, InvoiceRepository, ModuleRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { studentAttendance } from '../db/schema/attendance.js';
import { invoice } from '../db/index.js';
import { eq, and, between, sql } from 'drizzle-orm';

export class AttendanceService extends BaseService {
  constructor() {
    super();
    this.studentRepo = new StudentRepository();
    this.enrollmentRepo = new EnrollmentRepository();
    this.sessionRepo = new SessionRepository();
    this.invoiceRepo = new InvoiceRepository();
    this.moduleRepo = new ModuleRepository();
  }

  // ─── GET ATTENDANCE SHEET ──────────────────────────
  async getAttendanceSheet(sessionId) {
    // unchanged - this is all outside a transaction, async/await works fine here
    const db = getDb();
    const sess = await this.sessionRepo.findById(sessionId);
    if (!sess) throw new Error('Session not found');

    const enrollments = await db
      .select()
      .from(enrollment)
      .where(
        and(
          eq(enrollment.moduleId, sess.moduleId),
          eq(enrollment.isActive, true),
          sql`${enrollment.enrolledAt} <= ${sess.date}`
        )
      );

    const studentsWithStatus = [];
    for (const e of enrollments) {
      const student = await this.studentRepo.findById(e.studentId);
      if (!student) continue;

      const attendanceRecord = await db
        .select()
        .from(studentAttendance)
        .where(
          and(
            eq(studentAttendance.sessionId, sessionId),
            eq(studentAttendance.studentId, student.id)
          )
        )
        .limit(1);

      studentsWithStatus.push({
        student,
        enrollmentId: e.id,
        status: attendanceRecord.length > 0 ? attendanceRecord[0].status : null,
        recordedAt: attendanceRecord.length > 0 ? attendanceRecord[0].recordedAt : null
      });
    }

    studentsWithStatus.sort((a, b) => {
      if (a.student.lastName < b.student.lastName) return -1;
      if (a.student.lastName > b.student.lastName) return 1;
      if (a.student.firstName < b.student.firstName) return -1;
      if (a.student.firstName > b.student.firstName) return 1;
      return 0;
    });

    return { session: sess, students: studentsWithStatus };
  }

  // ─── MARK ATTENDANCE ───────────────────────────────
  async markAttendance(sessionId, attendanceList) {
    const db = getDb();

    // 1. Validate session (async, OUTSIDE the transaction — fine)
    const sess = await this.sessionRepo.findById(sessionId);
    if (!sess) throw new Error('Session not found');
    if (sess.status === 'cancelled') throw new Error('Cannot mark attendance for cancelled session');

    // 2. Get module
    const module = await this.moduleRepo.findById(sess.moduleId);
    if (!module) throw new Error('Module not found');

    // 3. Validate enrollments
    const validEnrollments = await this.enrollmentRepo.findActiveByModule(module.id);
    const validStudentIds = validEnrollments.map(e => e.studentId);

    const errors = [];
    const toUpsert = [];

    for (const item of attendanceList) {
      const { studentId, status } = item;
      if (!validStudentIds.includes(studentId)) {
        errors.push({ studentId, error: 'Student not enrolled or inactive' });
        continue;
      }
      if (!['present', 'absent'].includes(status)) {
        errors.push({ studentId, error: 'Invalid status. Must be "present" or "absent"' });
        continue;
      }
      toUpsert.push({ studentId, status });
    }

    if (toUpsert.length === 0) {
      throw new Error('No valid attendance records to mark');
    }

    // 4. Transaction: MUST be fully synchronous for better-sqlite3.
    //    - No `async`, no `await`, anywhere inside this callback or anything it calls.
    //    - Use `tx`, not the outer `db`, for every query.
    //    - Every query needs an explicit terminal method: .all() / .get() / .run().
    //      Without it, drizzle-orm/better-sqlite3 just builds the query and never executes it.
    const result = db.transaction((tx) => {
      const updatedRecords = [];

      for (const { studentId, status } of toUpsert) {
        const existing = tx
          .select()
          .from(studentAttendance)
          .where(
            and(
              eq(studentAttendance.sessionId, sessionId),
              eq(studentAttendance.studentId, studentId)
            )
          )
          .limit(1)
          .all(); // <-- executes synchronously, returns an array

        let record;
        if (existing.length > 0) {
          record = tx
            .update(studentAttendance)
            .set({
              status,
              recordedAt: new Date().toISOString()
            })
            .where(
              and(
                eq(studentAttendance.sessionId, sessionId),
                eq(studentAttendance.studentId, studentId)
              )
            )
            .returning()
            .get(); // <-- single row back, executes synchronously
        } else {
          record = tx
            .insert(studentAttendance)
            .values({
              sessionId,
              studentId,
              status,
              recordedAt: new Date().toISOString()
            })
            .returning()
            .get();
        }
        updatedRecords.push(record);

        if (sess.isAdditional) {
          const enr = validEnrollments.find(e => e.studentId === studentId);
          if (enr) {
            this._handleAdditionalSessionInvoiceSync(tx, sess, enr, status, module);
          }
        }
      }

      return { updated: updatedRecords.length, errors };
    });

    return {
      updated: result.updated,
      errors: result.errors
    };
  }

  // ─── HANDLE ADDITIONAL SESSION INVOICE (sync, transaction-scoped) ──
_handleAdditionalSessionInvoiceSync(tx, sess, enr, status, module) {
  const existingInvoice = tx
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.sessionId, sess.id),
        eq(invoice.enrollmentId, enr.id)
      )
    )
    .limit(1)
    .all()[0] || null;

  if (status === 'absent') {
    if (existingInvoice) {
      // Remove teacher share and delete invoice
      this._removeAdditionalSessionTeacherShareSync(tx, sess, enr, existingInvoice);
      tx.delete(invoice).where(eq(invoice.id, existingInvoice.id)).run();
    }
    return;
  }

  // status === 'present'
  if (!existingInvoice) {
    const price = sess.sessionPrice || module.sessionPrice || 0;
    if (price <= 0) return;

    const insertedInvoice = tx
      .insert(invoice)
      .values({
        enrollmentId: enr.id,
        amount: price,
        issueDate: new Date().toISOString(),
        dueDate: this._calculateDueDate(),
        status: 'pending',
        cycleNumber: 0,
        cycleStartDate: sess.date,
        cycleEndDate: sess.date,
        isProrated: false,
        originalMonthlyPrice: 0,
        creditApplied: 0,
        sessionCount: 1,
        sessionId: sess.id,
        notes: `Additional session on ${sess.date}`,
        createdAt: new Date().toISOString()
      })
      .returning()
      .get();

    this._handleAdditionalSessionTeacherPaymentSync(tx, sess, module, insertedInvoice);
  }
}

// ─── SYNC: Remove teacher share when additional session is marked absent ──
_removeAdditionalSessionTeacherShareSync(tx, sess, enr, invoiceRecord) {
  // Find the payment link for this invoice
  const link = tx
    .select()
    .from(paymentInvoice)
    .where(eq(paymentInvoice.invoiceId, invoiceRecord.id))
    .get();
  if (!link) return;

  // Get the associated payment
  const paymentRecord = tx
    .select()
    .from(payment)
    .where(eq(payment.id, link.paymentId))
    .get();
  if (!paymentRecord) return;

  // Only reduce if payment is still pending
  if (paymentRecord.status !== 'pending') return;

  // Reduce amount
  const newAmount = paymentRecord.amount - link.teacherShare;
  tx
    .update(payment)
    .set({ amount: Math.max(0, newAmount) })
    .where(eq(payment.id, paymentRecord.id))
    .run();

  // Delete the link
  tx
    .delete(paymentInvoice)
    .where(eq(paymentInvoice.id, link.id))
    .run();

  // Optionally, if payment amount becomes 0, we could delete it, but we'll leave it.
}



// ─── SYNC: Add teacher payment for additional session invoice ──
_handleAdditionalSessionTeacherPaymentSync(tx, sess, module, invoiceRecord) {
  // Get teacher
  const teacherRecord = tx
    .select()
    .from(teacher)
    .where(eq(teacher.id, sess.teacherId))
    .get();
  if (!teacherRecord) return;

  const percentage = teacherRecord.paymentPercentage || 0;
  const teacherShare = (invoiceRecord.amount * percentage) / 100;
  if (teacherShare <= 0) return;

  // Find existing pending payment for this teacher + module
  let paymentRecord = tx
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.teacherId, teacherRecord.id),
        eq(payment.moduleId, module.id),
        eq(payment.status, 'pending')
      )
    )
    .get();

  if (!paymentRecord) {
    // Create new pending payment
    paymentRecord = tx
      .insert(payment)
      .values({
        teacherId: teacherRecord.id,
        moduleId: module.id,
        amount: 0,
        periodStart: new Date().toISOString(),
        periodEnd: null,
        status: 'pending',
        paidAt: null,
        notes: `Additional session payment from invoice ${invoiceRecord.id}`
      })
      .returning()
      .get();
  }

  // Update payment amount
  const newAmount = paymentRecord.amount + teacherShare;
  tx
    .update(payment)
    .set({ amount: newAmount })
    .where(eq(payment.id, paymentRecord.id))
    .run();

  // Link invoice to payment
  tx
    .insert(paymentInvoice)
    .values({
      paymentId: paymentRecord.id,
      invoiceId: invoiceRecord.id,
      teacherShare: teacherShare,
    })
    .run();
}

  _calculateDueDate() {
    const now = new Date();
    now.setDate(now.getDate() + 15);
    return now.toISOString().split('T')[0];
  }

  // ─── GET STUDENT ATTENDANCE BY CYCLE ──────────────
  // unchanged — all async/await outside any transaction, this part was never broken
  async getStudentAttendanceByCycle(studentId, moduleId, cycleNumber) {
    const db = getDb();

    const module = await this.moduleRepo.findById(moduleId);
    if (!module) throw new Error('Module not found');

    const enr = await this.enrollmentRepo.findByStudentAndModule(studentId, moduleId);
    if (!enr) throw new Error('Student not enrolled in this module');

    const cycles = await this._getModuleCycles(moduleId);
    const cycle = cycles.find(c => c.cycleNumber === cycleNumber);
    if (!cycle) throw new Error('Cycle not found');

    const sessions = await db
      .select()
      .from(session)
      .where(
        and(
          eq(session.moduleId, moduleId),
          between(session.date, cycle.startDate, cycle.endDate)
        )
      )
      .orderBy(session.date, 'asc')
      .orderBy(session.startTime, 'asc');

    const sessionAttendances = [];
    for (const sess of sessions) {
      const attendance = await db
        .select()
        .from(studentAttendance)
        .where(
          and(
            eq(studentAttendance.sessionId, sess.id),
            eq(studentAttendance.studentId, studentId)
          )
        )
        .limit(1);

      sessionAttendances.push({
        session: sess,
        attendance: attendance.length > 0 ? attendance[0] : null
      });
    }

    const total = sessionAttendances.length;
    const presentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'present').length;
    const absentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'absent').length;
    const notMarked = total - presentCount - absentCount;
    const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      student: await this.studentRepo.findById(studentId),
      module,
      cycleNumber,
      cycleStart: cycle.startDate,
      cycleEnd: cycle.endDate,
      sessions: sessionAttendances,
      summary: {
        totalSessions: total,
        present: presentCount,
        absent: absentCount,
        notMarked,
        attendanceRate: parseFloat(attendanceRate.toFixed(2))
      }
    };
  }

  async _getModuleCycles(moduleId) {
    const db = getDb();
    const sessions = await db
      .select()
      .from(session)
      .where(
        and(
          eq(session.moduleId, moduleId),
          eq(session.isAdditional, false)
        )
      )
      .orderBy(session.date, 'asc');

    if (sessions.length === 0) return [];

    const cycles = [];
    let currentCycle = null;

    for (let i = 0; i < sessions.length; i++) {
      const sess = sessions[i];
      if (sess.sessionIndex === 1) {
        if (currentCycle) {
          currentCycle.endDate = sessions[i - 1].date;
          cycles.push(currentCycle);
        }
        currentCycle = {
          cycleNumber: currentCycle ? currentCycle.cycleNumber + 1 : 1,
          startDate: sess.date,
          sessions: []
        };
      }
      if (currentCycle) {
        currentCycle.sessions.push(sess);
      }
    }
    if (currentCycle) {
      const last = currentCycle.sessions[currentCycle.sessions.length - 1];
      currentCycle.endDate = last.date;
      cycles.push(currentCycle);
    }
    return cycles;
  }
}