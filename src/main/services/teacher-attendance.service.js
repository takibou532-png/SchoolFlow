// src/main/services/teacher-attendance.service.js
import { BaseService } from './base.service.js';
import { TeacherRepository, SessionRepository, ModuleRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';

import { eq, and, lte, gte, sql,inArray ,gt,not} from 'drizzle-orm';
import {  session, module_ as module} from '../db/schema/scheduling.js'; // teacher-attendance.service.js
import { teacherAttendance } from '../db/schema/attendance.js';
export class TeacherAttendanceService extends BaseService {
  constructor() {
    super();
    this.teacherRepo = new TeacherRepository();
    this.sessionRepo = new SessionRepository();
    this.moduleRepo = new ModuleRepository();
  }

  // ─── AUTO UPDATE TEACHER ATTENDANCE ──────────────
  /**
   * This function should be called:
   * - On app startup
   * - After session status changes (e.g., cancellation)
   * - Periodically (or manually via button)
   * 
   * It will:
   * 1. Mark teachers as 'present' for all past non-cancelled sessions that haven't been marked yet
   * 2. Mark teachers as 'absent' for all cancelled sessions that haven't been marked yet
   * 3. Handle cases where attendance status might need correction (e.g., session uncancelled)
   */
  async autoUpdateTeacherAttendance() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const results = {
      presentMarked: 0,
      absentMarked: 0,
      errors: []
    };

    // 1. Get all past sessions (date <= today) that are 'scheduled' or 'cancelled'
    const pastSessions = await db
      .select()
      .from(session)
      .where(
        and(
          lte(session.date, today),
          inArray(session.status, ['scheduled', 'cancelled'])
        )
      );

    for (const sess of pastSessions) {
      try {
        // Get the teacher for this session (from module)
        const module = await this.moduleRepo.findById(sess.moduleId);
        if (!module || !module.teacherId) continue;

        // Check if attendance already exists for this session + teacher
        const existing = await db
          .select()
          .from(teacherAttendance)
          .where(
            and(
              eq(teacherAttendance.sessionId, sess.id),
              eq(teacherAttendance.teacherId, module.teacherId)
            )
          )
          .limit(1);

        let status = null;
        if (sess.status === 'cancelled') {
          status = 'absent';
        } else if (sess.status === 'scheduled' && sess.date <= today) {
          // Only mark as present if session date is in the past
          status = 'present';
        }

        if (status) {
          // Upsert attendance
          if (existing.length > 0) {
            // Update if different
            if (existing[0].status !== status) {
              await db
                .update(teacherAttendance)
                .set({
                  status: status,
                  recordedAt: new Date().toISOString()
                })
                .where(eq(teacherAttendance.id, existing[0].id));
              if (status === 'present') results.presentMarked++;
              else results.absentMarked++;
            }
          } else {
            // Create new
            await db
              .insert(teacherAttendance)
              .values({
                sessionId: sess.id,
                teacherId: module.teacherId,
                status: status,
                recordedAt: new Date().toISOString()
              });
            if (status === 'present') results.presentMarked++;
            else results.absentMarked++;
          }
        }
      } catch (error) {
        results.errors.push({
          sessionId: sess.id,
          error: error.message
        });
      }
    }

    return results;
  }

  // ─── UPDATE ATTENDANCE ON SESSION STATUS CHANGE ──
  /**
   * This should be called when a session is cancelled or uncancelled
   * @param {number} sessionId
   * @param {string} newStatus - 'scheduled' | 'cancelled'
   */
  async updateAttendanceOnSessionStatusChange(sessionId, newStatus) {
    const db = getDb();
    const sess = await this.sessionRepo.findById(sessionId);
    if (!sess) throw new Error('Session not found');

    const module = await this.moduleRepo.findById(sess.moduleId);
    if (!module || !module.teacherId) throw new Error('Module or teacher not found');

    // Determine status
    let attendanceStatus = null;
    if (newStatus === 'cancelled') {
      attendanceStatus = 'absent';
    } else if (newStatus === 'scheduled') {
      const today = new Date().toISOString().split('T')[0];
      if (sess.date <= today) {
        attendanceStatus = 'present';
      } else {
        // Future session, no attendance needed yet
        // Delete any existing attendance record (if it was previously cancelled)
        await db
          .delete(teacherAttendance)
          .where(
            and(
              eq(teacherAttendance.sessionId, sessionId),
              eq(teacherAttendance.teacherId, module.teacherId)
            )
          );
        return { removed: true };
      }
    }

    if (!attendanceStatus) return null;

    // Upsert attendance
    const existing = await db
      .select()
      .from(teacherAttendance)
      .where(
        and(
          eq(teacherAttendance.sessionId, sessionId),
          eq(teacherAttendance.teacherId, module.teacherId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status !== attendanceStatus) {
        const updated = await db
          .update(teacherAttendance)
          .set({
            status: attendanceStatus,
            recordedAt: new Date().toISOString()
          })
          .where(eq(teacherAttendance.id, existing[0].id))
          .returning();
        return updated[0];
      }
      return existing[0];
    } else {
      const inserted = await db
        .insert(teacherAttendance)
        .values({
          sessionId: sessionId,
          teacherId: module.teacherId,
          status: attendanceStatus,
          recordedAt: new Date().toISOString()
        })
        .returning();
      return inserted[0];
    }
  }

  // ─── GET TEACHER ATTENDANCE BY CYCLE ─────────────
  async getTeacherAttendanceByCycle(teacherId, moduleId, cycleNumber) {
    const db = getDb();

    // 1. Get module
    const module = await this.moduleRepo.findById(moduleId);
    if (!module) throw new Error('Module not found');

    // 2. Verify teacher is assigned to this module
    if (module.teacherId !== teacherId) {
      throw new Error('Teacher is not assigned to this module');
    }

    // 3. Get cycles for this module
    const cycles = await this._getModuleCycles(moduleId);
    const cycle = cycles.find(c => c.cycleNumber === cycleNumber);
    if (!cycle) throw new Error('Cycle not found');

    // 4. Get all sessions in this cycle
    const sessions = await db
      .select()
      .from(session)
      .where(
        and(
          eq(session.moduleId, moduleId),
          gte(session.date, cycle.startDate),
          lte(session.date, cycle.endDate)
        )
      )
      .orderBy(session.date, 'asc')
      .orderBy(session.startTime, 'asc');

    // 5. For each session, get teacher attendance
    const sessionAttendances = [];
    for (const sess of sessions) {
      const attendance = await db
        .select()
        .from(teacherAttendance)
        .where(
          and(
            eq(teacherAttendance.sessionId, sess.id),
            eq(teacherAttendance.teacherId, teacherId)
          )
        )
        .limit(1);

      sessionAttendances.push({
        session: sess,
        attendance: attendance.length > 0 ? attendance[0] : null
      });
    }

    // 6. Compute summary
    const total = sessionAttendances.length;
    const presentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'present').length;
    const absentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'absent').length;
    const notMarked = total - presentCount - absentCount;
    const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      teacher: await this.teacherRepo.findById(teacherId),
      module: module,
      cycleNumber: cycleNumber,
      cycleStart: cycle.startDate,
      cycleEnd: cycle.endDate,
      sessions: sessionAttendances,
      summary: {
        totalSessions: total,
        present: presentCount,
        absent: absentCount,
        notMarked: notMarked,
        attendanceRate: parseFloat(attendanceRate.toFixed(2))
      }
    };
  }

  // ─── GET TEACHER ATTENDANCE BY DATE RANGE ─────────
  async getTeacherAttendanceByDateRange(teacherId, startDate, endDate) {
    const db = getDb();

    // 1. Get sessions assigned to this teacher within date range
    const sessions = await db
      .select()
      .from(session)
      .innerJoin(module, eq(session.moduleId, module.id))
      .where(
        and(
          eq(module.teacherId, teacherId),
          gte(session.date, startDate),
          lte(session.date, endDate)
        )
      )
      .orderBy(session.date, 'asc')
      .orderBy(session.startTime, 'asc');

    // 2. For each session, get teacher attendance
    const sessionAttendances = [];
    for (const sess of sessions) {
      const attendance = await db
        .select()
        .from(teacherAttendance)
        .where(
          and(
            eq(teacherAttendance.sessionId, sess.id),
            eq(teacherAttendance.teacherId, teacherId)
          )
        )
        .limit(1);

      sessionAttendances.push({
        session: sess,
        attendance: attendance.length > 0 ? attendance[0] : null
      });
    }

    // 3. Compute summary
    const total = sessionAttendances.length;
    const presentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'present').length;
    const absentCount = sessionAttendances.filter(a => a.attendance && a.attendance.status === 'absent').length;
    const notMarked = total - presentCount - absentCount;
    const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

    return {
      teacher: await this.teacherRepo.findById(teacherId),
      startDate: startDate,
      endDate: endDate,
      sessions: sessionAttendances,
      summary: {
        totalSessions: total,
        present: presentCount,
        absent: absentCount,
        notMarked: notMarked,
        attendanceRate: parseFloat(attendanceRate.toFixed(2))
      }
    };
  }

  // ─── PRIVATE: Get cycles (same as InvoiceService) ──
  async _getModuleCycles(moduleId) {
    const db = getDb();
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

    const cycles = [];
    let currentCycle = null;

    for (let i = 0; i < sessions.length; i++) {
      const sess = sessions[i];
      if (sess.sessionIndex === 1) {
        if (currentCycle) {
          currentCycle.endDate = sessions[i - 1].date;
          cycles.push(currentCycle);
        }
        currentCycle = {
          cycleNumber: currentCycle ? currentCycle.cycleNumber + 1 : 1,
          startDate: sess.date,
          sessions: []
        };
      }
      if (currentCycle) {
        currentCycle.sessions.push(sess);
      }
    }
    // Close last cycle
    if (currentCycle) {
      const last = currentCycle.sessions[currentCycle.sessions.length - 1];
      currentCycle.endDate = last.date;
      cycles.push(currentCycle);
    }
    return cycles;
  }
}