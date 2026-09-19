import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'


export const school = sqliteTable('school', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  stampPath: text('stamp_path'),
  logoPath: text('logo_path'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
})

// core.js
export const subject = sqliteTable('subject', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});

export const classroom = sqliteTable('classroom', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  capacity: integer('capacity'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});




export const expense = sqliteTable('expense', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});

export const student = sqliteTable('student', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: text('date_of_birth'),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  address: text('address'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  avatarPath: text('avatar_path'), // NEW
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});

export const teacher = sqliteTable('teacher', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  paymentPercentage: real('payment_percentage').notNull().default(70.0),
  avatarPath: text('avatar_path'), // NEW
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});


// ─── EMPLOYEE ──────────────────────────────────────────
export const employee = sqliteTable('employee', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

// ─── EMPLOYEE PAYMENT ─────────────────────────────────
export const employeePayment = sqliteTable('employee_payment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employee.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  paidAt: text('paid_at'),
  notes: text('notes'),
});

// ─── JOB APPLICATION ────────────────────────────────
export const jobApplication = sqliteTable('job_application', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  subjectId: integer('subject_id').notNull().references(() => subject.id, { onDelete: 'restrict' }),
  cvPath: text('cv_path'), // stored path to the PDF file
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
