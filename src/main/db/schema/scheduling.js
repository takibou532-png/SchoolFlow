import { sqliteTable, text, integer ,real} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { subject, classroom, teacher, student } from './core.js'

export const module_ = sqliteTable('module', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  level: text('level').notNull(),               // ← new field
  subjectId: integer('subject_id').notNull().references(() => subject.id, { onDelete: 'restrict' }),

  teacherId: integer('teacher_id').notNull().references(() => teacher.id, { onDelete: 'restrict' }),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  monthlyPrice: real('monthly_price').notNull(),
  sessionPrice: real('session_price').notNull(),
  sessionsPerMonth: integer('sessions_per_month').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
})


export const session = sqliteTable('session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleId: integer('module_id').notNull().references(() => module_.id, { onDelete: 'cascade' }),
  classroomId: integer('classroom_id').notNull().references(() => classroom.id, { onDelete: 'restrict' }),
  teacherId: integer('teacher_id').notNull().references(() => teacher.id, { onDelete: 'restrict' }),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  status: text('status', { enum: ['scheduled', 'cancelled'] }).notNull().default('scheduled'),
  sessionIndex: integer('session_index'),
  dayOfWeek: integer('day_of_week').notNull(),
  slotIndex: integer('slot_index'),
updatedAt: text('updated_at'),
  isAdditional: integer('is_additional', { mode: 'boolean' }).notNull().default(false),
  sessionPrice: real('session_price'), // Only used for additional sessions; NULL for regular sessions
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
});

export const enrollment = sqliteTable('enrollment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: integer('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
  moduleId: integer('module_id').notNull().references(() => module_.id, { onDelete: 'cascade' }),
  enrolledAt: text('enrolled_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
})
