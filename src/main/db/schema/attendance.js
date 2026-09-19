import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'; // add uniqueIndex import
import { sql } from 'drizzle-orm';
import { student, teacher } from './core.js';
import { session } from './scheduling.js';

export const studentAttendance = sqliteTable(
  'student_attendance',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
    studentId: integer('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['present', 'absent'] }).notNull(),
    recordedAt: text('recorded_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    unique: uniqueIndex('unique_student_session').on(table.sessionId, table.studentId),
  })
);

export const teacherAttendance = sqliteTable(
  'teacher_attendance',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
    teacherId: integer('teacher_id').notNull().references(() => teacher.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['present', 'absent'] }).notNull(),
    recordedAt: text('recorded_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    unique: uniqueIndex('unique_teacher_session').on(table.sessionId, table.teacherId),
  })
);