import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { student, teacher } from './core.js'
import { module_ ,session,enrollment } from './scheduling.js'
import { courseEnrollment } from './course.js'


// ─── INVOICE ──────────────────────────────────────────
export const invoice = sqliteTable('invoice', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  enrollmentId: integer('enrollment_id').references(() => enrollment.id, { onDelete: 'restrict' }),
  sessionId: integer('session_id').references(() => session.id, { onDelete: 'set null' }), 
  amount: real('amount').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date'),
  status: text('status', { enum: ['pending', 'paid', 'overdue', 'cancelled'] }).notNull().default('pending'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),

  courseEnrollmentId: integer('course_enrollment_id').references(() => courseEnrollment.id, { onDelete: 'set null' }),

  // Cycle info
  cycleNumber: integer('cycle_number').notNull(),
  cycleStartDate: text('cycle_start_date').notNull(),
  cycleEndDate: text('cycle_end_date').notNull(),
  isProrated: integer('is_prorated', { mode: 'boolean' }).notNull().default(false),
  originalMonthlyPrice: real('original_monthly_price').notNull(),
  creditApplied: real('credit_applied').notNull().default(0),
  sessionCount: integer('session_count').notNull(),
  attendedCount: integer('attended_count'), // for reporting, optional
  notes: text('notes')
});

// ─── CREDIT NOTE ──────────────────────────────────────
export const creditNote = sqliteTable('credit_note', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: integer('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  reason: text('reason'),
  sessionId: integer('session_id').references(() => session.id, { onDelete: 'set null' }),
  issuedAt: text('issued_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  appliedToInvoiceId: integer('applied_to_invoice_id').references(() => invoice.id, { onDelete: 'set null' }),
  appliedToCycle: integer('applied_to_cycle'), // which cycle it was applied to
  isApplied: integer('is_applied', { mode: 'boolean' }).notNull().default(false)
});

export const payment = sqliteTable('payment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teacherId: integer('teacher_id').notNull().references(() => teacher.id, { onDelete: 'restrict' }),
    moduleId: integer('module_id').notNull().references(() => module_.id, { onDelete: 'restrict' }),
  amount: real('amount').notNull(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end'),
  status: text('status', { enum: ['pending', 'paid', 'cancelled'] }).notNull().default('pending'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
    totalSessions: integer('total_sessions'), 
})


export const paymentInvoice = sqliteTable('payment_invoice', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paymentId: integer('payment_id').notNull().references(() => payment.id, { onDelete: 'cascade' }),
  invoiceId: integer('invoice_id').notNull().references(() => invoice.id, { onDelete: 'cascade' }),
  teacherShare: real('teacher_share').notNull(),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});
