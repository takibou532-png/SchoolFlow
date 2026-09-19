import { BaseService } from './base.service.js';
import { InvoiceRepository } from '../repositories/invoice.repository.js';
import { CreditNoteRepository } from '../repositories/credit-note.repository.js';
import { ModuleRepository } from '../repositories/module.repository.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { getDb } from '../db/client.js';
import { 
  student, enrollment, invoice, module_, 
  courseEnrollment, course ,session  // ← add these
} from '../db/index.js';
import { eq, and, gte, lte, sql, inArray, isNull, like, or, desc, between, not } from 'drizzle-orm';
import { PaymentService } from './payment.service.js';

export class InvoiceService extends BaseService {
  constructor() {
    super(new InvoiceRepository());
    this.creditNoteRepo = new CreditNoteRepository();
    this.moduleRepo = new ModuleRepository();
    this.enrollmentRepo = new EnrollmentRepository();
    this.sessionRepo = new SessionRepository();
    this.paymentService =new PaymentService();
    this.paymentRepo = new PaymentRepository();
  }


  // src/main/services/invoice.service.js

// ─── GET ALL INVOICES (with student & module info) ──
async getAllInvoices(options = {}) {
  const db = getDb();
  const { search, status, startDate, endDate, limit, offset, includeCancelled = false } = options;

  const conditions = [isNull(invoice.courseEnrollmentId)]; // always exclude course invoices

  if (search) {
    const term = `%${search}%`;
    conditions.push(sql`${student.firstName} || ' ' || ${student.lastName} LIKE ${term}`);
  }
  if (status && status !== 'all') {
    conditions.push(eq(invoice.status, status));
  } else if (!includeCancelled) {
    conditions.push(not(eq(invoice.status, 'cancelled')));
  }
  if (startDate && endDate) {
    conditions.push(between(invoice.issueDate, startDate, endDate));
  }

  let query = db
    .select({
      id: invoice.id,
      amount: invoice.amount,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      cycleNumber: invoice.cycleNumber,
      cycleStartDate: invoice.cycleStartDate,
      cycleEndDate: invoice.cycleEndDate,
      isProrated: invoice.isProrated,
      originalMonthlyPrice: invoice.originalMonthlyPrice,
      creditApplied: invoice.creditApplied,
      sessionCount: invoice.sessionCount,
      notes: invoice.notes,
      enrollmentId: invoice.enrollmentId,
      courseEnrollmentId: invoice.courseEnrollmentId,
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      moduleName: module_.name,
    })
    .from(invoice)
    .leftJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
    .leftJoin(student, eq(enrollment.studentId, student.id))
    .leftJoin(module_, eq(enrollment.moduleId, module_.id))
    .where(and(...conditions));

  query = query.orderBy(invoice.issueDate, 'desc');
  if (limit) query = query.limit(limit);
  if (offset) query = query.offset(offset);

  const results = await query;

  // Summary
  const summary = await db
    .select({
      pending: sql`sum(case when ${invoice.status} = 'pending' then 1 else 0 end)`,
      overdue: sql`sum(case when ${invoice.status} = 'overdue' then 1 else 0 end)`,
      paid: sql`sum(case when ${invoice.status} = 'paid' then 1 else 0 end)`,
      cancelled: sql`sum(case when ${invoice.status} = 'cancelled' then 1 else 0 end)`,
      totalPendingAmount: sql`sum(case when ${invoice.status} = 'pending' then ${invoice.amount} else 0 end)`,
      totalOverdueAmount: sql`sum(case when ${invoice.status} = 'overdue' then ${invoice.amount} else 0 end)`,
      totalPaidAmount: sql`sum(case when ${invoice.status} = 'paid' then ${invoice.amount} else 0 end)`,
    })
    .from(invoice)
    .where(
      and(
        isNull(invoice.courseEnrollmentId), // also missing here — see note below
      between(sql`substr(${invoice.issueDate}, 1, 10)`, startDate || '2000-01-01', endDate || '2100-01-01')
      )
    );

  return {
    invoices: results.map(r => ({
      ...r,
      studentName: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown',
       issueDate: r.issueDate?.slice(0, 10),
    })),
    summary: {
      pending: Number(summary[0]?.pending || 0),
      overdue: Number(summary[0]?.overdue || 0),
      paid: Number(summary[0]?.paid || 0),
      cancelled: Number(summary[0]?.cancelled || 0),
      totalPendingAmount: Number(summary[0]?.totalPendingAmount || 0),
      totalOverdueAmount: Number(summary[0]?.totalOverdueAmount || 0),
      totalPaidAmount: Number(summary[0]?.totalPaidAmount || 0),
    },
  };
}

  // ─── MAIN GENERATION ENTRY ──────────────────────────
// src/main/services/invoice.service.js

async generateInvoices(onlyCurrentCycle = true, manual = false) {
  const db = getDb();
  const results = { generated: 0, students: 0, errors: [] };

  const enrollments = await this.enrollmentRepo.findAll({
    where: { isActive: true }
  });

  if (enrollments.length === 0) {
    return { ...results, message: 'No active enrollments' };
  }

  const today = new Date().toISOString().split('T')[0];

  for (const enroll of enrollments) {
    try {
      const module = await this.moduleRepo.findById(enroll.moduleId);
      if (!module || !module.isActive) continue;

      const cycles = await this._getModuleCycles(module.id);
      if (cycles.length === 0) continue;

      const enrollmentDate = new Date(enroll.enrolledAt);
      let missingCycles = [];

      if (onlyCurrentCycle) {
        // ─── 1. Find the cycle that contains today ──
        let targetCycle = cycles.find(c => c.startDate <= today && c.endDate >= today);

        // ─── 2. If no current cycle, find the next upcoming cycle ──
        if (!targetCycle) {
          targetCycle = cycles.find(c => c.startDate > today);
        }

        if (targetCycle) {
          const existing = await this.repository.findByEnrollmentAndCycle(
            enroll.id,
            targetCycle.cycleNumber
          );
          if (!existing) {
            missingCycles = [targetCycle];
          }
        }
      } else {
        // ─── Manual: Generate ALL missing cycles ──
        for (const cycle of cycles) {
          if (new Date(cycle.endDate) < enrollmentDate) continue;
          const existing = await this.repository.findByEnrollmentAndCycle(
            enroll.id,
            cycle.cycleNumber
          );
          if (!existing) {
            missingCycles.push(cycle);
          }
        }
      }

      if (missingCycles.length === 0) continue;

      for (const cycle of missingCycles) {
        await this._generateInvoiceForCycle(enroll, module, cycle);
        results.generated++;
      }
      results.students++;

    } catch (error) {
      results.errors.push({ enrollmentId: enroll.id, error: error.message });
    }
  }

  return results;
}


  // ─── GET INVOICES BY STUDENT ─────────────────────────
async getInvoicesByStudent(studentId) {
  const db = getDb();
  const { invoice, enrollment } = await import('../db/index.js');

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  };

  const results = await db
    .select({
      id: invoice.id,
      amount: invoice.amount,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      enrollmentId: invoice.enrollmentId,
    })
    .from(invoice)
    .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
    .where(eq(enrollment.studentId, studentId))
    .orderBy(desc(invoice.createdAt));

  return results.map((r) => ({
    ...r,
    issueDate: formatDate(r.issueDate),
    dueDate: formatDate(r.dueDate),
    paidAt: formatDate(r.paidAt),
    createdAt: formatDate(r.createdAt),
  }));
}

  // src/main/services/invoice.service.js

// ─────────────────────────────────────────────────────────────────
// ADDITIONS TO src/main/services/invoice.service.js
// Paste these two methods inside the InvoiceService class (e.g. right
// after cancelInvoicesForEnrollment). Also add the two extra imports
// noted at the top of this file to your existing import block.
// ─────────────────────────────────────────────────────────────────

// Add to the top-of-file imports in invoice.service.js:
//   import { eq, and, gte, lte, sql, inArray, isNull, like, or } from 'drizzle-orm';
// (replaces your current `import { eq, and, gte, lte, sql,inArray } from 'drizzle-orm';`)
//
// Also make sure `student` is importable — either add it to the existing
// `import { session, enrollment, module_ } from '../db/index.js';` line
// (if db/index.js re-exports it) or import it directly from its schema
// file, matching however `invoice` itself is imported in this file.

/** Get all regular (non-course) invoices with a specific status,
 joined with student + module info, newest first.
  @param {string} status - 'pending' | 'paid' | 'overdue' | 'cancelled'
 @param {Object} options - { limit, offset, search }
*/
async getInvoicesByStatus(status, options = {}) {
  const db = getDb();
  const { limit, offset, search } = options;
 
  // Base filter: status match + regular module invoices only (no course invoices)
  const conditions = [
    eq(invoice.status, status),
    isNull(invoice.courseEnrollmentId)
  ];
 
  // Search by student name or module name — folded into the SAME
  // condition set instead of a second .where() call, since drizzle's
  // .where() replaces rather than combines filters on repeated calls.
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(student.firstName, term),
        like(student.lastName, term),
        like(module_.name, term)
      )
    );
  }
 
  let query = db
    .select({
      invoice: invoice,
      enrollmentId: enrollment.id,
      studentId: student.id,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
      moduleId: module_.id,
      moduleName: module_.name,
    })
    .from(invoice)
    .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(module_, eq(enrollment.moduleId, module_.id))
    .where(and(...conditions))
    .orderBy(sql`${invoice.createdAt} DESC`);
 
  if (limit) query = query.limit(limit);
  if (offset) query = query.offset(offset);
 
  return await query;
}
 
// ─── MARK INVOICE AS PAID ────────────────────────────
/**
 * Mark a pending/overdue invoice as paid.
 * @param {number} invoiceId
 * @param {string} [paidAt] - optional ISO date; defaults to now
 */
async markInvoiceAsPaid(invoiceId, paidAt = null) {
  const existing = await this.repository.findById(invoiceId);
  if (!existing) throw new Error('Invoice not found');
  if (existing.status === 'paid') throw new Error('Invoice is already paid');
  if (existing.status === 'cancelled') throw new Error('Cannot mark a cancelled invoice as paid');
 
  const paidDate = paidAt || new Date().toISOString();
  return this.repository.update(invoiceId, {
    status: 'paid',
    paidAt: paidDate,
  });
}

// ─── GENERATE INVOICE FOR A SPECIFIC CYCLE ──────────
async _generateInvoiceForCycle(enrollment, module, cycle) {
  const db = getDb();

  // 1. Determine proration if enrollment started mid-cycle
  const enrolledAt = new Date(enrollment.enrolledAt);
  const cycleStart = new Date(cycle.startDate);
  const isProrated = enrolledAt > cycleStart;

  let amount = module.monthlyPrice;
  let notes = null;
  let missedSessions = 0;

  if (isProrated) {
    missedSessions = cycle.sessions.filter(s => new Date(s.date) < enrolledAt).length;
    const sessionPrice = module.sessionPrice || 0;
    amount = module.monthlyPrice - (missedSessions * sessionPrice);
    notes = `Prorated: joined on ${enrollment.enrolledAt} (missed ${missedSessions} sessions)`;
    if (amount < 0) amount = 0;
  }

  // 2. Final amount (no credits)
  const finalAmount = amount;

  // 3. Create invoice
  const invoiceData = {
    enrollmentId: enrollment.id,
    amount: finalAmount,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: this._calculateDueDate(),
    status: 'pending',
    cycleNumber: cycle.cycleNumber,
    cycleStartDate: cycle.startDate,
    cycleEndDate: cycle.endDate,
    isProrated: isProrated,
    originalMonthlyPrice: module.monthlyPrice,
    creditApplied: 0,
    sessionCount: cycle.sessions.length,
    attendedCount: null,
    notes: notes
  };

  const newInvoice = await this.repository.create(invoiceData);

  // 4. Generate teacher payment
  if (newInvoice && newInvoice.amount > 0) {
    try {
      await this.paymentService.generatePaymentForInvoice(newInvoice.id);
    } catch (error) {
      console.error(`Failed to generate payment for invoice ${newInvoice.id}:`, error);
    }
  }

  return newInvoice;
}

async _getModuleCycles(moduleId) {
  const db = getDb();
  // Get all regular sessions (not additional) sorted by date
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

  // Get sessionsPerMonth from the module
  const module = await this.moduleRepo.findById(moduleId);
  if (!module) throw new Error('Module not found');
  const sessionsPerMonth = module.sessionsPerMonth;

  const cycles = [];
  let currentCycle = null;

  for (let i = 0; i < sessions.length; i++) {
    const sess = sessions[i];
    // Calculate cycle number based on index
    // If sessionIndex is 1, start a new cycle
    if (sess.sessionIndex === 1) {
      if (currentCycle) {
        // Close previous cycle
        const prevSessions = currentCycle.sessions;
        currentCycle.endDate = prevSessions[prevSessions.length - 1].date;
        cycles.push(currentCycle);
      }
      currentCycle = {
        cycleNumber: currentCycle ? currentCycle.cycleNumber + 1 : 1,
        startDate: sess.date,
        sessions: [],
      };
    }
    if (currentCycle) {
      currentCycle.sessions.push(sess);
    }
  }
  // Close last cycle
  if (currentCycle) {
    const lastSessions = currentCycle.sessions;
    currentCycle.endDate = lastSessions[lastSessions.length - 1].date;
    cycles.push(currentCycle);
  }

  return cycles;
}

  // ─── GET PREVIOUS CYCLE ─────────────────────────────
  async _getPreviousCycle(moduleId, cycleNumber) {
    const cycles = await this._getModuleCycles(moduleId);
    return cycles.find(c => c.cycleNumber === cycleNumber - 1) || null;
  }

  // ─── CALCULATE DUE DATE ─────────────────────────────
  _calculateDueDate() {
    const now = new Date();
    now.setDate(now.getDate() + 15); // 15 days from issue
    return now.toISOString().split('T')[0];
  }

  // ─── GENERATE INVOICE FOR STUDENT ON ENROLLMENT ─────
  // This will be called from StudentService
  async generateInvoiceForNewEnrollment(enrollmentOrId) {
  try {
    let enrollment;
  if (typeof enrollmentOrId === 'object' && enrollmentOrId.id) {
    enrollment = enrollmentOrId;
  } else {
    enrollment = await this.enrollmentRepo.findById(enrollmentOrId);
    if (!enrollment) throw new Error('Enrollment not found');
  }

    const module = await this.moduleRepo.findById(enrollment.moduleId);
    if (!module) throw new Error('Module not found');

    const cycles = await this._getModuleCycles(module.id);
    if (cycles.length === 0) {
      console.warn(`⚠️ No cycles found for module ${module.id}. Sessions may be missing or indices are incorrect.`);
      throw new Error('No cycles found for this module');
    }

    // Find the current cycle (the one that contains today or the next session)
    const today = new Date().toISOString().split('T')[0];
    let currentCycle = cycles.find(c => c.startDate <= today && c.endDate >= today);
    if (!currentCycle) {
      // If no current cycle, pick the first future cycle
      currentCycle = cycles.find(c => c.startDate > today) || cycles[cycles.length - 1];
    }

    return await this._generateInvoiceForCycle(enrollment, module, currentCycle);
  } catch (error) {
    console.error('❌ Failed to generate invoice for enrollment:', error);
    throw error; // re-throw so the caller knows it failed
  }
}


  // src/main/services/invoice.service.js

// Add these methods:

// ─── UPDATE INVOICE ──────────────────────────────────
/**
 * Update invoice amount only (for pending invoices)
 * @param {number} invoiceId 
 * @param {number} newAmount 
 * @param {string} reason - optional reason for update
 */
async updateInvoice(invoiceId, newAmount, reason = null) {
  const db = getDb();

  // 1. Get existing invoice
  const invoice = await this.repository.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  // 2. Validate invoice can be updated
  if (invoice.status === 'paid') {
    throw new Error('Cannot update a paid invoice');
  }
  if (invoice.status === 'cancelled') {
    throw new Error('Cannot update a cancelled invoice');
  }

  // 3. Validate new amount
  if (typeof newAmount !== 'number' || newAmount < 0) {
    throw new Error('Amount must be a positive number');
  }

  // 4. If amount is the same, return early
  if (invoice.amount === newAmount) {
    return invoice;
  }

  // 4.5 NEW: check the linked payment BEFORE committing anything
  const linkedPayment = await this.paymentRepo.findPaymentByInvoice(invoiceId);
  if (linkedPayment && linkedPayment.status !== 'pending') {
    throw new Error(
      `Cannot update invoice: it belongs to a payment that is already ${linkedPayment.status}`
    );
  }

  // 5. Update invoice in transaction
  const result = await db.transaction(() => {
    const oldAmount = invoice.amount;
    const updated = this.repository.update(invoiceId, {
      amount: newAmount,
      notes: reason ? `${invoice.notes || ''}\nUpdated: ${reason}` : invoice.notes
    });
    return { updated, oldAmount };
  });

  // 6. Sync payment — no longer swallow the error, since we already
  // pre-checked; if it throws now, something changed concurrently
  // and the caller genuinely needs to know.
  await this.paymentService.updatePaymentForInvoice(
    invoiceId,
    result.oldAmount,
    newAmount
  );

  return result.updated;
}

// ─── CANCEL INVOICE ──────────────────────────────────
/**
 * Cancel an invoice (only pending invoices)
 * @param {number} invoiceId 
 * @param {string} reason - optional reason for cancellation
 */
async cancelInvoice(invoiceId, reason = null) {
  const db = getDb();

  // 1. Get existing invoice
  const invoice = await this.repository.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  // 2. Validate invoice can be cancelled
  if (invoice.status === 'paid') {
    throw new Error('Cannot cancel a paid invoice');
  }
  if (invoice.status === 'cancelled') {
    throw new Error('Invoice is already cancelled');
  }

  // 3. Cancel invoice in transaction
  const result = await db.transaction(() => {
    // Update invoice status
    const updated = this.repository.update(invoiceId, {
      status: 'cancelled',
      notes: reason ? `${invoice.notes || ''}\nCancelled: ${reason}` : invoice.notes
    });

    return updated;
  });

  // After transaction, remove from teacher payment
  try {
    await this.paymentService.removePaymentForInvoice(invoiceId);
  } catch (error) {
    // Log error but don't fail the invoice cancellation
    console.error(`Failed to remove payment for invoice ${invoiceId}:`, error);
  }

  return result;
}

// ─── CANCEL ALL INVOICES FOR ENROLLMENT ─────────────
/**
 * Cancel all pending invoices for an enrollment
 * @param {number} enrollmentId 
 * @param {string} reason - optional reason for cancellation
 */
async cancelInvoicesForEnrollment(enrollmentId, reason = null) {
  const db = getDb();

  // Get all pending invoices for this enrollment
  const invoices = await db
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.enrollmentId, enrollmentId),
        inArray(invoice.status,['pending', 'overdue'])
      )
    );

  if (invoices.length === 0) {
    return { cancelled: 0, invoices: [] };
  }

  const results = [];
  for (const inv of invoices) {
    const cancelled = await this.cancelInvoice(
      inv.id,
      reason || 'Enrollment suspended'
    );
    results.push(cancelled);
  }

  return {
    cancelled: results.length,
    invoices: results 
  };
}
}