// src/main/db/schema/course.js
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { school, student, teacher } from './core.js';

export const course = sqliteTable('course', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  subjectName: text('subject_name').notNull(),
  level: text('level'),
  maxStudents: integer('max_students'),

  // Teacher - internal or external
  teacherId: integer('teacher_id').references(() => teacher.id, { onDelete: 'set null' }),
 

  // Pricing
  totalPrice: real('total_price').notNull(),
  sessionPrice: real('session_price').notNull(), // For proration


  // Dates
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),

  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});


export const courseSession = sqliteTable('course_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('course_id').notNull().references(() => course.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  sessionIndex: integer('session_index').notNull(), // 1, 2, 3... N
  status: text('status', { enum: ['scheduled', 'cancelled'] }).notNull().default('scheduled'),
  isAcive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});



export const courseEnrollment = sqliteTable('course_enrollment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('course_id').notNull().references(() => course.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
  enrolledAt: text('enrolled_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  price: real('price').notNull(), // Full or prorated
 
}, (table) => ({
  // Unique: one enrollment per student per course
  unique: uniqueIndex('idx_unique_course_enrollment').on(table.courseId, table.studentId)
}));

export const courseAttendance = sqliteTable('course_attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseSessionId: integer('course_session_id').notNull().references(() => courseSession.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['present', 'absent'] }).notNull(),
  recordedAt: text('recorded_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  unique: uniqueIndex('idx_unique_course_attendance').on(table.courseSessionId, table.studentId)
}));

export const coursePayment = sqliteTable('course_payment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('course_id').notNull().references(() => course.id, { onDelete: 'restrict' }),
  teacherId: integer('teacher_id').notNull().references(() => teacher.id, { onDelete: 'restrict' }),
  amount: real('amount').notNull(),
  status: text('status', { enum: ['pending', 'paid', 'cancelled'] }).notNull().default('pending'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
 
});