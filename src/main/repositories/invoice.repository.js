// src/main/repositories/invoice.repository.js
import { BaseRepository } from './base.repository.js';
import { invoice, enrollment } from '../db/index.js';
import { eq, and ,inArray} from 'drizzle-orm';

export class InvoiceRepository extends BaseRepository {
  constructor() {
    super(invoice);
  }


  

  // ─── FIND BY ENROLLMENT AND CYCLE ──────────────
  async findByEnrollmentAndCycle(enrollmentId, cycleNumber) {
    const db = this.db();
    const result = await db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.enrollmentId, enrollmentId),
          eq(invoice.cycleNumber, cycleNumber)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // ─── FIND BY SESSION AND ENROLLMENT ─────────────
  // For additional session invoices
  async findBySessionAndEnrollment(sessionId, enrollmentId) {
    const db = this.db();
    const result = await db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.sessionId, sessionId),
          eq(invoice.enrollmentId, enrollmentId)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // ─── FIND BY SESSION AND STUDENT ────────────────
  // Helper to find invoice for a session and student (joins enrollment)
  async findBySessionAndStudent(sessionId, studentId) {
    const db = this.db();
    const result = await db
      .select({invoice})
      .from(invoice)
      .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
      .where(
        and(
          eq(invoice.sessionId, sessionId),
          eq(enrollment.studentId, studentId)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // ─── FIND UNPAID BY STUDENT ─────────────────────
  async findUnpaidByStudent(studentId) {
    const db = this.db();
    return await db
      .select({invoice})
      .from(invoice)
      .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
      .where(
        and(
          eq(enrollment.studentId, studentId),
          inArray(invoice.status,['pending', 'overdue'])
        )
      );
  }

  // ─── DELETE ─────────────────────────────────────
  // BaseRepository already has delete(id), but we add a helper
  async deleteBySessionAndEnrollment(sessionId, enrollmentId) {
    const db = this.db();
    const result = await db
      .delete(invoice)
      .where(
        and(
          eq(invoice.sessionId, sessionId),
          eq(invoice.enrollmentId, enrollmentId)
        )
      )
      .returning();
    return result[0] || null;
  }
//  Update inoice 
  async updateInvoice(id, data) {
  const db = this.db();
  const result = await db
    .update(invoice)
    .set(data)
    .where(eq(invoice.id, id))
    .returning();
  return result[0] || null;
}

async findByEnrollment(enrollmentId, status = null) {
  const db = this.db();
  let query = db.select().from(invoice).where(eq(invoice.enrollmentId, enrollmentId));
  if (status) {
    query = query.where(eq(invoice.status, status));
  }
  return await query.orderBy(invoice.createdAt, 'desc');
}

// Add method to find pending invoices by enrollment
async findPendingByEnrollment(enrollmentId) {
  const db = this.db();
  return await db
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.enrollmentId, enrollmentId),
        inArray(invoice.status,(['pending', 'overdue']))
      )
    );
}

async findPendingByCourseEnrollment(courseEnrollmentId) {
  const db = this.db();
  return await db
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.courseEnrollmentId, courseEnrollmentId),
        inArray(invoice.status,(['pending', 'overdue']))
      )
    );
}

async findPendingByCourseEnrollment(courseEnrollmentId) {
  const db = this.db();
  return await db
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.courseEnrollmentId, courseEnrollmentId),
        inArray(invoice.status,(['pending', 'overdue']))
      )
    );
}
}