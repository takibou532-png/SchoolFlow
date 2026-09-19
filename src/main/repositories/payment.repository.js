// src/main/repositories/payment.repository.js
import { BaseRepository } from './base.repository.js';
import { payment, paymentInvoice } from '../db/index.js';
import { eq, and, isNull } from 'drizzle-orm';

export class PaymentRepository extends BaseRepository {
  constructor() {
    super(payment);
  }

  // ─── FIND PENDING PAYMENT BY TEACHER AND MODULE ──
  async findPendingByTeacherAndModule(teacherId, moduleId) {
    const db = this.db();
    const result = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.teacherId, teacherId),
          eq(payment.moduleId, moduleId),
          eq(payment.status, 'pending')
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // ─── FIND ALL PENDING PAYMENTS ──────────────────
  async findAllPending() {
    const db = this.db();
    return await db
      .select()
      .from(payment)
      .where(eq(payment.status, 'pending'));
  }

  // ─── FIND PAYMENTS BY TEACHER ──────────────────
  async findByTeacher(teacherId, options = {}) {
    const { status, limit, offset } = options;
    const db = this.db();
    let query = db.select().from(payment).where(eq(payment.teacherId, teacherId));
    if (status) {
      query = query.where(eq(payment.status, status));
    }
    query = query.orderBy(payment.createdAt, 'desc');
    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);
    return await query;
  }

  // ─── GET PAYMENT INVOICES ──────────────────────
  async getPaymentInvoices(paymentId) {
    const db = this.db();
    return await db
      .select()
      .from(paymentInvoice)
      .where(eq(paymentInvoice.paymentId, paymentId));
  }

  // ─── ADD INVOICE TO PAYMENT ────────────────────
  async addInvoiceToPayment(paymentId, invoiceId, teacherShare) {
    const db = this.db();
    const result = await db
      .insert(paymentInvoice)
      .values({
        paymentId: paymentId,
        invoiceId: invoiceId,
        teacherShare: teacherShare
      })
      .returning();
    return result[0];
  }

  // ─── REMOVE INVOICE FROM PAYMENT ──────────────
  async removeInvoiceFromPayment(paymentId, invoiceId) {
    const db = this.db();
    const result = await db
      .delete(paymentInvoice)
      .where(
        and(
          eq(paymentInvoice.paymentId, paymentId),
          eq(paymentInvoice.invoiceId, invoiceId)
        )
      )
      .returning();
    return result[0] || null;
  }

  // ─── GET INVOICE PAYMENT LINK ──────────────────
async findPaymentByInvoice(invoiceId) {
  const db = this.db();
  const result = await db
    .select({
      id: payment.id,
      teacherId: payment.teacherId,
      moduleId: payment.moduleId,
      amount: payment.amount,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })
    .from(payment)
    .innerJoin(paymentInvoice, eq(payment.id, paymentInvoice.paymentId))
    .where(eq(paymentInvoice.invoiceId, invoiceId))
    .limit(1);
  return result[0] || null;
}
}