// src/main/services/payment.service.js
import { BaseService } from './base.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { TeacherRepository, ModuleRepository, InvoiceRepository, EnrollmentRepository ,StudentRepository} from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { payment ,paymentInvoice,session} from '../db/index.js';
import { eq, and, sql, gte, lte, ne } from 'drizzle-orm';

export class PaymentService extends BaseService {
  constructor() {
    super(new PaymentRepository());
    this.teacherRepo = new TeacherRepository();
    this.moduleRepo = new ModuleRepository();
    this.invoiceRepo = new InvoiceRepository();
    this.enrollmentRepo = new EnrollmentRepository();
    this.studentRepo = new StudentRepository();
  }

  // src/main/services/payment.service.js

// ─── GENERATE PAYMENT FOR INVOICE ────────────────
/**
 * Called when a new invoice is created (cycle invoice or additional session invoice)
 * @param {number} invoiceId 
 */
async generatePaymentForInvoice(invoiceId) {
  const db = getDb();
  console.log('🔍 generatePaymentForInvoice called for invoice:', invoiceId);

  // 1. Get invoice
  const invoice = await this.invoiceRepo.findById(invoiceId);
  if (!invoice) {
    console.error('❌ Invoice not found:', invoiceId);
    throw new Error('Invoice not found');
  }
  console.log('✅ Invoice found:', invoice.id, 'amount:', invoice.amount);

  // 2. Get enrollment and module
  const enrollment = await this.enrollmentRepo.findById(invoice.enrollmentId);
  if (!enrollment) {
    console.error('❌ Enrollment not found for invoice:', invoiceId);
    throw new Error('Enrollment not found');
  }
  const module = await this.moduleRepo.findById(enrollment.moduleId);
  if (!module) {
    console.error('❌ Module not found for enrollment:', enrollment.id);
    throw new Error('Module not found');
  }
  console.log('✅ Module found:', module.name);

  // 3. Get teacher
  const teacher = await this.teacherRepo.findById(module.teacherId);
  if (!teacher) {
    console.error('❌ Teacher not found for module:', module.id);
    throw new Error('Teacher not found');
  }
  console.log('✅ Teacher found:', teacher.firstName, teacher.lastName, 'percentage:', teacher.paymentPercentage);

  // 4. Calculate teacher share
  const percentage = teacher.paymentPercentage || 70;
  const teacherShare = (invoice.amount * percentage) / 100;
  if (teacherShare <= 0) {
    console.warn('⚠️ Teacher share is 0 or negative, skipping payment');
    return null;
  }
  console.log('💰 Teacher share:', teacherShare);

  // 5. Check if a payment already exists for this invoice (avoid duplicates)
  const existingPaymentLink = await db
    .select()
    .from(paymentInvoice)
    .where(eq(paymentInvoice.invoiceId, invoiceId))
    .limit(1);
  if (existingPaymentLink.length > 0) {
    console.log('✅ Payment already linked to this invoice, skipping');
    return existingPaymentLink[0];
  }

  // 6. Find or create pending payment for this teacher + module
  let pendingPayment = await db
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.teacherId, teacher.id),
        eq(payment.moduleId, module.id),
        eq(payment.status, 'pending')
      )
    )
    .limit(1)
    .then(rows => rows[0] || null);

  if (!pendingPayment) {
    console.log('📝 No pending payment found, creating one');
    const [newPayment] = await db
      .insert(payment)
      .values({
        teacherId: teacher.id,
        moduleId: module.id,
        amount: 0,
        periodStart: new Date().toISOString(),
        periodEnd: null,
        status: 'pending',
        paidAt: null,
        notes: `Created from invoice ${invoiceId}`
      })
      .returning();
    pendingPayment = newPayment;
    console.log('✅ New payment created:', pendingPayment.id);
  } else {
    console.log('✅ Found pending payment:', pendingPayment.id);
  }

  // 7. Update payment amount (add teacher share)
  const newAmount = pendingPayment.amount + teacherShare;
  const [updatedPayment] = await db
    .update(payment)
    .set({ amount: newAmount })
    .where(eq(payment.id, pendingPayment.id))
    .returning();
  console.log('✅ Payment amount updated to:', newAmount);

  // 8. Link invoice to payment
  const [link] = await db
    .insert(paymentInvoice)
    .values({
      paymentId: pendingPayment.id,
      invoiceId: invoice.id,
      teacherShare: teacherShare,
    })
    .returning();
  console.log('✅ Invoice linked to payment:', link);

  return updatedPayment;
}

  // ─── UPDATE PAYMENT FOR UPDATED INVOICE ──────────
  /**
   * Called when an invoice is updated (amount changed, etc.)
   * @param {number} invoiceId 
   * @param {number} oldAmount 
   * @param {number} newAmount 
   */
  async updatePaymentForInvoice(invoiceId, oldAmount, newAmount) {
    const db = getDb();

    // 1. Get invoice
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // 2. Get enrollment and module
    const enrollment = await this.enrollmentRepo.findById(invoice.enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    const module = await this.moduleRepo.findById(enrollment.moduleId);
    if (!module) throw new Error('Module not found');

    // 3. Get teacher
    const teacher = await this.teacherRepo.findById(module.teacherId);
    if (!teacher) throw new Error('Teacher not found');

    // 4. Find the payment this invoice belongs to
    const payment = await this.repository.findPaymentByInvoice(invoiceId);
    if (!payment) {
      // If no payment exists, generate one
      return await this.generatePaymentForInvoice(invoiceId);
    }

    // 5. Only update if payment is still pending
    if (payment.status !== 'pending') {
      throw new Error('Cannot update payment: payment is already paid or cancelled');
    }

    // 6. Calculate old and new teacher shares
    const percentage = teacher.paymentPercentage || 70;
    const oldShare = (oldAmount * percentage) / 100;
    const newShare = (newAmount * percentage) / 100;
    const difference = newShare - oldShare;

    if (difference === 0) return payment;

    // 7. Update payment amount
    const newPaymentAmount = payment.amount + difference;
    const updatedPayment = await this.repository.update(payment.id, {
      amount: newPaymentAmount
    });

    // 8. Update the invoice link with new share
    // First remove old link, then add new one
    await this.repository.removeInvoiceFromPayment(payment.id, invoiceId);
    await this.repository.addInvoiceToPayment(payment.id, invoiceId, newShare);

    return updatedPayment;
  }

  // ─── REMOVE PAYMENT FOR CANCELLED INVOICE ────────
  /**
   * Called when an invoice is cancelled
   * @param {number} invoiceId 
   */
  async removePaymentForInvoice(invoiceId) {
    const db = getDb();

    // 1. Get invoice
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // 2. Find the payment this invoice belongs to
    const payment = await this.repository.findPaymentByInvoice(invoiceId);
    if (!payment) return null; // No payment linked – nothing to do

    // 3. Only update if payment is still pending
    if (payment.status !== 'pending') {
      throw new Error('Cannot remove invoice from paid/cancelled payment');
    }

    // 4. Get the teacher share from the junction table
    const paymentInvoices = await this.repository.getPaymentInvoices(payment.id);
    const invoiceLink = paymentInvoices.find(pi => pi.invoiceId === invoiceId);
    if (!invoiceLink) throw new Error('Invoice not linked to payment');

    // 5. Subtract the share from payment amount
    const newAmount = payment.amount - invoiceLink.teacherShare;
    const updatedPayment = await this.repository.update(payment.id, {
      amount: newAmount
    });

    // 6. Remove the link
    await this.repository.removeInvoiceFromPayment(payment.id, invoiceId);

    // 7. If payment amount is 0, we can optionally delete it or leave it (I'll leave it)
    return updatedPayment;
  }


// ─── MARK PAYMENT AS PAID (WITH PARTIAL SUPPORT) ──
/**
 * Mark a pending payment as paid (supports partial payments)
 * @param {number} paymentId
 * @param {number} amountToPay - amount to pay (if less than total, creates partial)
 * @param {string} paidAt - optional date
 */
async markPaymentAsPaid(paymentId, amountToPay, paidAt = null) {
  const db = getDb();

  const payment = await this.repository.findById(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'pending') {
    throw new Error('Only pending payments can be marked as paid');
  }

  if (typeof amountToPay !== 'number' || amountToPay <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (amountToPay > payment.amount) {
    throw new Error(`Amount exceeds pending payment (${payment.amount})`);
  }

  const paidDate = paidAt || new Date().toISOString();

  const result = await db.transaction(() => {
    if (amountToPay === payment.amount) {
      const updated = this.repository.update(paymentId, {
        status: 'paid',
        paidAt: paidDate,
        periodEnd: paidDate,
        notes: payment.notes 
          ? `${payment.notes}\nFull payment on ${paidDate}`
          : `Full payment on ${paidDate}`
      });
      return { type: 'full', payment: updated };
    } else {
      const paidPayment = this.repository.create({
        teacherId: payment.teacherId,
        moduleId: payment.moduleId,
        amount: amountToPay,
        periodStart: payment.periodStart,
        periodEnd: paidDate,
        status: 'paid',
        paidAt: paidDate,
        notes: `Partial payment on ${paidDate} (${amountToPay} of ${payment.amount})`
      });

      const newAmount = payment.amount - amountToPay;
      const updatedPending = this.repository.update(paymentId, {
        amount: newAmount,
        notes: payment.notes 
          ? `${payment.notes}\nPartial payment: ${amountToPay} paid on ${paidDate}`
          : `Partial payment: ${amountToPay} paid on ${paidDate}`
      });

      return { 
        type: 'partial', 
        paidPayment: paidPayment, 
        pendingPayment: updatedPending,
        remainingAmount: newAmount
      };
    }
  });

  // ✅ After transaction, if full payment, update totalSessions
 if (result.type === 'full') {
  try {
    await this._updateTotalSessions(paymentId);
  } catch (error) {
    console.error(`❌ Failed to update totalSessions for payment ${paymentId}:`, error);
  }
 }
  return result;
}

  // ─── CANCEL PAYMENT ──────────────────────────────
  /**
   * Cancel a pending payment (e.g., if all invoices are cancelled)
   * @param {number} paymentId 
   */
  async cancelPayment(paymentId) {
    const db = getDb();

    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    if (payment.status !== 'pending') {
      throw new Error('Only pending payments can be cancelled');
    }

    // Check if payment has any invoices
    const invoices = await this.repository.getPaymentInvoices(paymentId);
    if (invoices.length > 0) {
      // Remove all invoice links
      for (const inv of invoices) {
        await this.repository.removeInvoiceFromPayment(paymentId, inv.invoiceId);
      }
    }

    const updated = await this.repository.update(paymentId, {
      status: 'cancelled',
      amount: 0
    });

    return updated;
  }

// ─── GET TEACHER PAYMENT HISTORY ──────────────────
/**
 * @param {number} teacherId 
 * @param {Object} options - { status, limit, offset, includeInvoices }
 */
async getTeacherPaymentHistory(teacherId, options = {}) {
  const { status, limit, offset, includeInvoices = true } = options;

  // 1. Get payments
  const payments = await this.repository.findByTeacher(teacherId, {
    status,
    limit,
    offset
  });

  // 2. Get teacher details
  const teacher = await this.teacherRepo.findById(teacherId);

  // 3. Helper: format date to YYYY-MM-DD
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return dateStr.split('T')[0]; // "2026-08-30"
    } catch {
      return dateStr;
    }
  };

  // 4. For each payment, get linked invoices with details
  const result = {
    teacher: teacher,
    payments: []
  };

  for (const pay of payments) {
    // Build clean payment DTO
    const paymentData = {
      id: pay.id,
      teacherId: pay.teacherId,
      moduleId: pay.moduleId,
      amount: pay.amount,
      periodStart: formatDate(pay.periodStart),
      periodEnd: formatDate(pay.periodEnd),
      status: pay.status,
      paidAt: formatDate(pay.paidAt),
      createdAt: formatDate(pay.createdAt),
    
      totalSessions: pay.totalSessions , // ✅ included
    };

    if (includeInvoices) {
      const links = await this.repository.getPaymentInvoices(pay.id);
      const invoices = [];
      for (const link of links) {
        const invoice = await this.invoiceRepo.findById(link.invoiceId);
        if (invoice) {
          const enrollment = await this.enrollmentRepo.findById(invoice.enrollmentId);
          let studentName = 'Unknown';
          if (enrollment) {
            const student = await this.studentRepo.findById(enrollment.studentId);
            if (student) {
              studentName = `${student.firstName} ${student.lastName}`;
            }
          }
          invoices.push({
            invoiceId: invoice.id,
            amount: invoice.amount,
            status: invoice.status,
            issueDate: formatDate(invoice.issueDate),
            teacherShare: link.teacherShare,
            studentName: studentName,
          });
        }
      }
      paymentData.invoices = invoices;
    }
    result.payments.push(paymentData);
  }

  return result;
}

  // ─── GET TEACHER PENDING PAYMENTS ──────────────────
  async getTeacherPendingPayments(teacherId) {
    // Get all pending payments for this teacher (across modules)
    const db = this.db();
    const payments = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.teacherId, teacherId),
          eq(payment.status, 'pending')
        )
      );

    // For each payment, get the module name and invoice count
    const result = [];
    for (const pay of payments) {
      const module = await this.moduleRepo.findById(pay.moduleId);
      const invoices = await this.repository.getPaymentInvoices(pay.id);
      result.push({
        ...pay,
        moduleName: module ? module.name : 'Unknown Module',
        invoiceCount: invoices.length
      });
    }
    return result;
  }

  // ─── GET PAYMENT DETAILS ──────────────────────────
  async getPaymentDetails(paymentId) {
    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    const teacher = await this.teacherRepo.findById(payment.teacherId);
    const module = await this.moduleRepo.findById(payment.moduleId);
    const links = await this.repository.getPaymentInvoices(paymentId);

    const invoices = [];
    for (const link of links) {
      const invoice = await this.invoiceRepo.findById(link.invoiceId);
      if (invoice) {
        const enrollment = await this.enrollmentRepo.findById(invoice.enrollmentId);
        let studentName = 'Unknown';
        if (enrollment) {
          const student = await this.studentRepo.findById(enrollment.studentId);
          if (student) {
            studentName = `${student.firstName} ${student.lastName}`;
          }
        }
        invoices.push({
          invoice: invoice,
          teacherShare: link.teacherShare,
          studentName: studentName
        });
      }
    }

    return {
      payment: payment,
      teacher: teacher,
      module: module,
      invoices: invoices,
      totalAmount: payment.amount,
      totalInvoices: invoices.length
    };
  }



// ─── PRIVATE: Update Total Sessions for a Payment ──
/**
 * Calculate total non-cancelled sessions taught by the teacher
 * between periodStart and paidAt (the payment period).
 * Only called when payment is fully paid.
 * @param {number} paymentId
 */
async _updateTotalSessions(paymentId) {
  const db = getDb();

  const payment = await this.repository.findById(paymentId);
  if (!payment) {
    console.warn(`⚠️ Payment ${paymentId} not found for totalSessions update`);
    return;
  }

  const { teacherId, moduleId, periodStart, periodEnd } = payment;
  if (!periodStart || !periodEnd) {
    console.warn(`⚠️ Payment ${paymentId} missing periodStart or periodEnd`);
    return;
  }

  // ✅ Extract only the date part (YYYY-MM-DD) to avoid time comparison issues
  const startDate = periodStart.split('T')[0];
  const endDate = periodEnd.split('T')[0];

  console.log(`📊 Counting sessions for teacher ${teacherId}, module ${moduleId}, from ${startDate} to ${endDate}`);

  // Count non-cancelled sessions for this teacher and module in the period
  const result = await db
    .select({ count: sql`count(*)` })
    .from(session)
    .where(
      and(
        eq(session.teacherId, teacherId),
        eq(session.moduleId, moduleId),
        gte(session.date, startDate),
        lte(session.date, endDate),
        ne(session.status, 'cancelled')
      )
    );

  const totalSessions = Number(result[0]?.count || 0);
  console.log(`✅ Found ${totalSessions} non-cancelled sessions for payment ${paymentId}`);

  await this.repository.update(paymentId, {
    totalSessions: totalSessions,
  });
}
}