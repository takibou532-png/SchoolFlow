import { BaseService } from './base.service.js';
import { 
  CoursePaymentRepository,
  CourseRepository,
  TeacherRepository,
  CourseEnrollmentRepository,
  InvoiceRepository,
  StudentRepository
} from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { coursePayment, invoice } from '../db/index.js';
import { eq, and, inArray, desc } from 'drizzle-orm';

export class CoursePaymentService extends BaseService {
  constructor() {
    super(new CoursePaymentRepository());
    this.courseRepo = new CourseRepository();
    this.teacherRepo = new TeacherRepository();
    this.enrollmentRepo = new CourseEnrollmentRepository();
    this.invoiceRepo = new InvoiceRepository();
    this.studentRepo = new StudentRepository();
  }

  // ─── GET COURSE PENDING PAYMENT ──────────────────
  /**
   * Get pending payment for a specific course and teacher
   * @param {number} courseId
   * @param {number} teacherId
   */
  async getCoursePendingPayment(courseId, teacherId) {
    const db = getDb();
    const result = await db
      .select()
      .from(coursePayment)
      .where(
        and(
          eq(coursePayment.courseId, courseId),
          eq(coursePayment.teacherId, teacherId),
          eq(coursePayment.status, 'pending')
        )
      )
      .limit(1);
    return result[0] || null;
  }

  // ─── GET TEACHER COURSE PAYMENTS ─────────────────
  /**
   * Get all course payments for a teacher with options
   * @param {number} teacherId
   * @param {Object} options - { status, limit, offset, includeInvoices }
   */
  async getTeacherCoursePayments(teacherId, options = {}) {
    const { status, limit, offset, includeInvoices = false } = options;
    const db = getDb();

    // 1. Get teacher
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    // 2. Build conditions and query once (Drizzle .where() calls don't merge - build the AND up front)
    const conditions = [eq(coursePayment.teacherId, teacherId)];
    if (status) {
      conditions.push(eq(coursePayment.status, status));
    }

    let query = db
      .select()
      .from(coursePayment)
      .where(and(...conditions))
      .orderBy(desc(coursePayment.createdAt));

    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    const payments = await query;

    // 3. Augment with course info and invoices
    const result = {
      teacher: teacher,
      payments: []
    };

    let totalPending = 0;
    let totalPaid = 0;
    let grandTotal = 0;

    for (const pay of payments) {
      const course = await this.courseRepo.findById(pay.courseId);
      const paymentData = {
        ...pay,
        course: course || null
      };

      // Get invoice count for this payment
      const paymentInvoices = await this._getPaymentInvoices(pay.id);
      paymentData.invoiceCount = paymentInvoices.length;

      if (includeInvoices) {
        paymentData.invoices = await this._getPaymentInvoicesWithDetails(pay.id);
      }

      // Update totals
      if (pay.status === 'pending') totalPending += pay.amount;
      else if (pay.status === 'paid') totalPaid += pay.amount;
      grandTotal += pay.amount;

      result.payments.push(paymentData);
    }

    result.summary = {
      totalPending: parseFloat(totalPending.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2))
    };

    return result;
  }

  // ─── MARK COURSE PAYMENT AS PAID (Partial Support) ──
  /**
   * Mark a pending course payment as paid (supports partial payments)
   * @param {number} paymentId
   * @param {number} amountToPay - amount to pay (if less than total, creates partial)
   * @param {string} paidAt - optional date
   */
  async markCoursePaymentAsPaid(paymentId, amountToPay, paidAt = null) {
    const db = getDb();

    // 1. Validate payment exists and is pending
    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'pending') {
      throw new Error('Only pending payments can be marked as paid');
    }

    // 2. Validate amount
    if (typeof amountToPay !== 'number' || amountToPay <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (amountToPay > payment.amount) {
      throw new Error(`Amount exceeds pending payment (${payment.amount})`);
    }

    const paidDate = paidAt || new Date().toISOString();

    // 3. In transaction: handle payment
    // NOTE: better-sqlite3's Drizzle driver runs transactions synchronously.
    // The callback itself must not be async - repository calls inside must be
    // the synchronous better-sqlite3 style (no await) or already-resolved.
    const result = db.transaction(() => {
      if (amountToPay === payment.amount) {
        // Full payment
        const updated = this.repository.update(paymentId, {
          status: 'paid',
          paidAt: paidDate,
          notes: `Full payment on ${paidDate}`
        });
        return { type: 'full', payment: updated };
      } else {
        // Partial payment: create new paid payment and reduce pending one
        // Create paid payment
        const paidPayment = this.repository.create({
          courseId: payment.courseId,
          teacherId: payment.teacherId,
          amount: amountToPay,
          status: 'paid',
          paidAt: paidDate,
          notes: `Partial payment on ${paidDate} (${amountToPay} of ${payment.amount})`
        });

        // Reduce pending payment
        const newAmount = payment.amount - amountToPay;
        const updatedPending = this.repository.update(paymentId, {
          amount: newAmount,
          notes: payment.notes 
            ? `${payment.notes}\nPartial payment: ${amountToPay} paid on ${paidDate}`
            : `Partial payment: ${amountToPay} paid on ${paidDate}`
        });

        return { type: 'partial', paidPayment: paidPayment, pendingPayment: updatedPending };
      }
    });

    return result;
  }

  // ─── CANCEL COURSE PAYMENT ──────────────────────
  /**
   * Cancel a pending course payment
   * @param {number} paymentId
   * @param {string} reason
   */
  async cancelCoursePayment(paymentId, reason = null) {
    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'pending') {
      throw new Error('Only pending payments can be cancelled');
    }

    return await this.repository.update(paymentId, {
      status: 'cancelled',
      amount: 0,
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
    });
  }

  // ─── CANCEL ALL PENDING PAYMENTS FOR COURSE ──────
  /**
   * Cancel all pending payments for a course
   * @param {number} courseId
   * @param {string} reason
   */
  async cancelAllPendingPaymentsForCourse(courseId, reason = null) {
    const db = getDb();
    const payments = await db
      .select()
      .from(coursePayment)
      .where(
        and(
          eq(coursePayment.courseId, courseId),
          eq(coursePayment.status, 'pending')
        )
      );

    if (payments.length === 0) {
      return { cancelled: 0, payments: [] };
    }

    const results = [];
    for (const pay of payments) {
      const cancelled = await this.cancelCoursePayment(
        pay.id,
        reason || `Course ${courseId} archived/cancelled`
      );
      results.push(cancelled);
    }

    return {
      cancelled: results.length,
      payments: results
    };
  }

  // ─── GET COURSE PAYMENT DETAILS ──────────────────
  /**
   * Get full details of a specific course payment
   * @param {number} paymentId
   */
  async getCoursePaymentDetails(paymentId) {
    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    const course = await this.courseRepo.findById(payment.courseId);
    const teacher = await this.teacherRepo.findById(payment.teacherId);

    // Get all invoices for this payment by finding all course enrollments
    // and then their invoices that would contribute to this payment
    const invoices = await this._getPaymentInvoicesWithDetails(paymentId);

    return {
      payment: payment,
      course: course,
      teacher: teacher,
      invoices: invoices,
      summary: {
        totalAmount: payment.amount,
        invoiceCount: invoices.length
      }
    };
  }

  // ─── GET ALL PENDING COURSE PAYMENTS ─────────────
  /**
   * Get all pending course payments (admin dashboard)
   */
  async getAllPendingCoursePayments() {
    const db = getDb();
    const payments = await db
      .select()
      .from(coursePayment)
      .where(eq(coursePayment.status, 'pending'))
      .orderBy(desc(coursePayment.createdAt));

    const result = [];
    for (const pay of payments) {
      const teacher = await this.teacherRepo.findById(pay.teacherId);
      const course = await this.courseRepo.findById(pay.courseId);
      result.push({
        payment: pay,
        teacher: teacher || null,
        course: course || null
      });
    }
    return result;
  }

  // ─── COMBINED TEACHER PAYMENTS (Regular + Course) ──
  /**
   * Get combined payments for a teacher (both regular module payments and course payments)
   * @param {number} teacherId
   */
  async getCombinedTeacherPayments(teacherId) {
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    // Get regular module payments (from PaymentService)
    const { PaymentService } = await import('./payment.service.js');
    const paymentService = new PaymentService();
    const regularPayments = await paymentService.getTeacherPaymentHistory(teacherId, {
      includeInvoices: false
    });

    // Get course payments
    const coursePayments = await this.getTeacherCoursePayments(teacherId, {
      includeInvoices: false
    });

    // Combine summaries
    const combined = {
      teacher: teacher,
      regularPayments: regularPayments,
      coursePayments: coursePayments,
      summary: {
        regularPending: regularPayments.summary?.totalPending || 0,
        regularPaid: regularPayments.summary?.totalPaid || 0,
        coursePending: coursePayments.summary?.totalPending || 0,
        coursePaid: coursePayments.summary?.totalPaid || 0,
        totalPending: (regularPayments.summary?.totalPending || 0) + (coursePayments.summary?.totalPending || 0),
        totalPaid: (regularPayments.summary?.totalPaid || 0) + (coursePayments.summary?.totalPaid || 0),
        grandTotal: (regularPayments.summary?.grandTotal || 0) + (coursePayments.summary?.grandTotal || 0)
      }
    };

    return combined;
  }

  // ─── PRIVATE: Get Payment Invoices ────────────────
  async _getPaymentInvoices(paymentId) {
    const db = getDb();
    // For course payments, we need to find invoices linked to course enrollments
    // that would contribute to this payment
    const payment = await this.repository.findById(paymentId);
    if (!payment) return [];

    const enrollments = await this.enrollmentRepo.findActiveByCourse(payment.courseId);
    const enrollmentIds = enrollments.map(e => e.id);

    if (enrollmentIds.length === 0) return [];

    const invoices = await db
      .select()
      .from(invoice)
      .where(
        and(
          inArray(invoice.courseEnrollmentId, enrollmentIds),
          inArray(invoice.status, ['pending', 'paid', 'overdue'])
        )
      );

    return invoices;
  }

  async _getPaymentInvoicesWithDetails(paymentId) {
    const invoices = await this._getPaymentInvoices(paymentId);
    const result = [];
    for (const inv of invoices) {
      const enrollment = await this.enrollmentRepo.findById(inv.courseEnrollmentId);
      if (!enrollment) continue;
      const student = await this.studentRepo.findById(enrollment.studentId);
      result.push({
        invoice: inv,
        enrollment: enrollment,
        student: student || null
      });
    }
    return result;
  }

  /**
   * Get all payments for a course.
   * @param {number} courseId
   * @returns {Promise<Array>} Array of payment objects
   */
  async getPaymentsByCourse(courseId) {
    const db = getDb();
    const { coursePayment } = await import('../db/index.js');
    const results = await db
      .select()
      .from(coursePayment)
      .where(eq(coursePayment.courseId, courseId))
      .orderBy(coursePayment.createdAt, 'desc');
    return results;
  }
}