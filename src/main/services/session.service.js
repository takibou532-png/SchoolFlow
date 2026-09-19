// src/main/services/session.service.js
import { BaseService } from './base.service.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { ModuleRepository } from '../repositories/module.repository.js';
import { getDb } from '../db/client.js';
import { session, enrollment ,module_,teacher,classroom} from '../db/index.js';
import { eq, and, gte, lte, between, sql, not ,gt} from 'drizzle-orm';
import { DAY_MAP, VALID_DAYS } from '../utils/day-mapping.js';
import { TeacherAttendanceService } from './teacher-attendance.service.js';
import { ClassroomRepository } from '../repositories/index.js';

export class SessionService extends BaseService {
  constructor() {
    super(new SessionRepository());
    this.moduleRepo = new ModuleRepository();
    this.classroomRepo = new ClassroomRepository();
    this.teacherAttendanceService = new TeacherAttendanceService();
  }

  // ─── CREATE ADDITIONAL SESSION ──────────────────
  async createAdditionalSession(dto) {
    const db = getDb();

    // Required fields: moduleId, date, startTime, endTime, price, classroomId
    const required = ['moduleId', 'date', 'startTime', 'endTime', 'price', 'classroomId'];
    for (const field of required) {
      if (dto[field] === undefined || dto[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate module
    const module = await this.moduleRepo.findById(dto.moduleId);
    if (!module) throw new Error('Module not found');
    if (!module.isActive) throw new Error('Cannot add session to archived module');

    // Validate classroom
    const classroom = await this.classroomRepo.findById(dto.classroomId);
    if (!classroom) throw new Error('Classroom not found');

    // Validate date
    const sessionDate = new Date(dto.date);
    const startDate = new Date(module.startDate);
    const endDate = new Date(module.endDate);
    if (isNaN(sessionDate) || sessionDate < startDate || sessionDate > endDate) {
      throw new Error(`Date must be between ${module.startDate} and ${module.endDate}`);
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(dto.startTime) || !timeRegex.test(dto.endTime)) {
      throw new Error('Invalid time format. Use HH:mm');
    }
    if (dto.startTime >= dto.endTime) {
      throw new Error('startTime must be before endTime');
    }

    const dayOfWeek = sessionDate.getDay();

    // Check conflicts using this classroom and teacher
    const conflicts = await this._checkConflicts(
      dto.classroomId,
      module.teacherId,
      dto.date,
      dto.startTime,
      dto.endTime,
      null
    );
    if (conflicts) {
      throw new Error(`Conflict: ${conflicts}`);
    }

    // Create session
    const sessionData = {
      moduleId: dto.moduleId,
      classroomId: dto.classroomId,
      teacherId: module.teacherId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: 'scheduled',
      sessionIndex: null,
      dayOfWeek: dayOfWeek,
      isAdditional: true,
      sessionPrice: dto.price,
      createdAt: new Date().toISOString()
    };

    return this.repository.create(sessionData);
  }


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

  const module = await this.moduleRepo.findById(moduleId);
  if (!module) throw new Error('Module not found');

  const cycles = [];
  let currentCycle = null;

  for (let i = 0; i < sessions.length; i++) {
    const sess = sessions[i];
    if (sess.sessionIndex === 1) {
      if (currentCycle) {
        const prevSessions = currentCycle.sessions;
        currentCycle.endDate = prevSessions[prevSessions.length - 1]?.date || sess.date;
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
    currentCycle.endDate = lastSessions[lastSessions.length - 1]?.date || currentCycle.startDate;
    cycles.push(currentCycle);
  }
  return cycles;
}


async _validateSessionOrder(sessionId, moduleId, newDate) {
  const db = getDb();

  // 1. Get the current session
  const currentSession = await this.repository.findById(sessionId);
  if (!currentSession) throw new Error('Session not found');
  if (currentSession.isAdditional) return; // skip validation for additional sessions
  if (currentSession.sessionIndex === null) return;

  // 2. Get all cycles for the module
  const cycles = await this._getModuleCycles(moduleId);
  if (cycles.length === 0) return;

  // 3. Find which cycle the current session belongs to
  const today = currentSession.date; // use current date to find its cycle
  let targetCycle = cycles.find(c => c.startDate <= today && c.endDate >= today);
  if (!targetCycle) {
    // If the current session is not in any cycle (should not happen), skip
    return;
  }

  // 4. Get all sessions in that cycle (excluding the current one)
  const cycleSessions = targetCycle.sessions.filter(s => s.id !== sessionId);

  // 5. Sort them by sessionIndex (ascending)
  cycleSessions.sort((a, b) => a.sessionIndex - b.sessionIndex);

  // 6. Find the previous and next session based on index
  const currentIndex = currentSession.sessionIndex;
  let prevSession = null;
  let nextSession = null;

  for (const s of cycleSessions) {
    if (s.sessionIndex < currentIndex) {
      // Keep the one with the largest index smaller than current
      if (!prevSession || s.sessionIndex > prevSession.sessionIndex) {
        prevSession = s;
      }
    } else if (s.sessionIndex > currentIndex) {
      // Keep the one with the smallest index greater than current
      if (!nextSession || s.sessionIndex < nextSession.sessionIndex) {
        nextSession = s;
      }
    }
  }

  // 7. Validate the new date against the previous and next sessions
  const newDateObj = new Date(newDate);
  const prevDate = prevSession ? new Date(prevSession.date) : null;
  const nextDate = nextSession ? new Date(nextSession.date) : null;

  if (prevDate && newDateObj <= prevDate) {
    throw new Error(
      `Session must be after the previous session (${prevSession.date}) in the cycle.`
    );
  }
  if (nextDate && newDateObj >= nextDate) {
    throw new Error(
      `Session must be before the next session (${nextSession.date}) in the cycle.`
    );
  }
}

  // ─── UPDATE INDIVIDUAL SESSION ──────────────────
 // ─── UPDATE INDIVIDUAL SESSION ──────────────────
async updateSession(sessionId, data) {
  const db = getDb();
  const existing = await this.repository.findById(sessionId);
  if (!existing) throw new Error('Session not found');
  if (existing.status === 'cancelled') {
    throw new Error('Cannot update a cancelled session');
  }

  const module = await this.moduleRepo.findById(existing.moduleId);
  if (!module.isActive) throw new Error('Cannot update session of archived module');

  const updateData = {};

  // ─── Validate and build update data ──────────────
  if (data.classroomId !== undefined) {
    const classroom = await this.classroomRepo.findById(data.classroomId);
    if (!classroom) throw new Error('Classroom not found');
    updateData.classroomId = data.classroomId;
  }

  if (data.date) {
    const newDate = new Date(data.date);
    if (isNaN(newDate)) throw new Error('Invalid date format');
    const startDate = new Date(module.startDate);
    const endDate = new Date(module.endDate);
    if (newDate < startDate || newDate > endDate) {
      throw new Error(`Date must be between ${module.startDate} and ${module.endDate}`);
    }
    updateData.date = data.date;
    updateData.dayOfWeek = newDate.getDay();
  }

  if (data.startTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.startTime)) {
      throw new Error('Invalid startTime format. Use HH:mm');
    }
    updateData.startTime = data.startTime;
  }

  if (data.endTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.endTime)) {
      throw new Error('Invalid endTime format. Use HH:mm');
    }
    updateData.endTime = data.endTime;
  }

  const start = updateData.startTime || existing.startTime;
  const end = updateData.endTime || existing.endTime;
  if (start >= end) {
    throw new Error('startTime must be before endTime');
  }

  if (data.price !== undefined) {
    if (!existing.isAdditional) {
      throw new Error('Cannot set price on regular session (use module sessionPrice)');
    }
    if (typeof data.price !== 'number' || data.price < 0) {
      throw new Error('Price must be a positive number');
    }
    updateData.sessionPrice = data.price;
  }

  const finalClassroomId = updateData.classroomId || existing.classroomId;
  const finalDate = updateData.date || existing.date;
  const finalStart = updateData.startTime || existing.startTime;
  const finalEnd = updateData.endTime || existing.endTime;

  // ─── Conflict Check ──────────────────────────────
  const conflicts = await this._checkConflicts(
    finalClassroomId,
    module.teacherId,
    finalDate,
    finalStart,
    finalEnd,
    sessionId
  );
  if (conflicts) {
    throw new Error(`Conflict: ${conflicts}`);
  }

  // ─── Validate date order within cycle ──────────
  if (updateData.date) {
    await this._validateSessionOrder(sessionId, module.id, updateData.date);
  }

  // ─── Apply update ──────────────────────────────
  const updated = await this.repository.update(sessionId, updateData);

  // ─── (Attendance updates removed) ──────────────

  return updated;
}


// ─── CANCEL SESSION ─────────────────────────────
async cancelSession(sessionId) {
  const db = getDb();
  const existing = await this.repository.findById(sessionId);
  if (!existing) throw new Error('Session not found');
  if (existing.status === 'cancelled') {
    throw new Error('Session is already cancelled');
  }

  const module = await this.moduleRepo.findById(existing.moduleId);
  if (!module.isActive) throw new Error('Cannot cancel session of archived module');

  // ─── Re-index and cancel in a transaction ──────
  const result = db.transaction(() => {
    // 1. Re-index all future regular sessions
    this._reindexFutureSessions(
      module.id,
      sessionId,
      existing.date,
      module.sessionsPerMonth
    );

    // 2. Mark the session as cancelled
    const updated = this.repository.update(sessionId, { status: 'cancelled' });

    return updated;
  });

  // ─── (Optional) If you still want to update teacher attendance, do it here as a separate async call ──
  // This could be done outside the transaction to avoid blocking, but it's fine.
  // For now we skip it because auto-attendance will catch up.

  return result;
}

// ─── PRIVATE: Re-index all future regular sessions ──
_reindexFutureSessions(moduleId, cancelledSessionId, cancelledDate, sessionsPerMonth) {
  const db = getDb();

  // 1. Get all regular sessions of this module, ordered by date,
  //    excluding the cancelled one, that occur after the cancelled date.
  const sessions = db
    .select()
    .from(session)
    .where(
      and(
        eq(session.moduleId, moduleId),
        eq(session.isAdditional, false),
        not(eq(session.id, cancelledSessionId)),
        gt(session.date, cancelledDate) // sessions with date > cancelledDate
      )
    )
    .orderBy(session.date, 'asc')
    .all(); // execute synchronously

  if (sessions.length === 0) return;

  // 2. For each session, decrement index, wrap if it becomes 0.
  for (const sess of sessions) {
    const newIndex = sess.sessionIndex - 1;
    const finalIndex = newIndex === 0 ? sessionsPerMonth : newIndex;

    db
      .update(session)
      .set({ sessionIndex: finalIndex })
      .where(eq(session.id, sess.id))
      .run();
  }
}

  // ─── GET SESSIONS BY DAY ────────────────────────
 async getSessionsByDay(date, options = {}) {
  const db = getDb();
  const { moduleId, includeCancelled = false } = options;
  const dateObj = new Date(date);
  if (isNaN(dateObj)) throw new Error('Invalid date format. Use YYYY-MM-DD');

  const conditions = [eq(session.date, date)];
  if (moduleId) {
    conditions.push(eq(session.moduleId, moduleId));
  }
  if (!includeCancelled) {
    conditions.push(eq(session.status, 'scheduled'));
  }

  // Join with module, teacher, classroom
  const results = await db
    .select({
      id: session.id,
      moduleId: session.moduleId,
      classroomId: session.classroomId,
      teacherId: session.teacherId,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      sessionIndex: session.sessionIndex,
      dayOfWeek: session.dayOfWeek,
      isAdditional: session.isAdditional,
      sessionPrice: session.sessionPrice,
      createdAt: session.createdAt,
      moduleName: module_.name,
      teacherFirstName: teacher.firstName,
      teacherLastName: teacher.lastName,
      classroomName: classroom.name,
    })
    .from(session)
    .innerJoin(module_, eq(session.moduleId, module_.id))
    .innerJoin(teacher, eq(session.teacherId, teacher.id))
    .innerJoin(classroom, eq(session.classroomId, classroom.id))
    .where(and(...conditions))
    .orderBy(session.startTime, 'asc');

  return results.map(r => ({
    ...r,
    teacherName: `${r.teacherFirstName} ${r.teacherLastName}`,
    classroomName: r.classroomName || 'N/A',
  }));
}

  
// ─── GET SESSIONS BY WEEK ───────────────────────
async getSessionsByWeek(weekStart, options = {}) {
  const db = getDb();
  const { moduleId, includeCancelled = false } = options;
  const start = new Date(weekStart);
  if (isNaN(start)) throw new Error('Invalid date format. Use YYYY-MM-DD');
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(start.setDate(diff));
  const mondayStr = monday.toISOString().split('T')[0];
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sundayStr = sunday.toISOString().split('T')[0];

  const conditions = [
    gte(session.date, mondayStr),
    lte(session.date, sundayStr),
    eq(session.isAdditional, false), // exclude additional
  ];
  if (moduleId) {
    conditions.push(eq(session.moduleId, moduleId));
  }
  if (!includeCancelled) {
    conditions.push(eq(session.status, 'scheduled'));
  }

  const results = await db
    .select({
      id: session.id,
      moduleId: session.moduleId,
      classroomId: session.classroomId,
      teacherId: session.teacherId,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      sessionIndex: session.sessionIndex,
      dayOfWeek: session.dayOfWeek,
      isAdditional: session.isAdditional,
      sessionPrice: session.sessionPrice,
      createdAt: session.createdAt,
      moduleName: module_.name,
      teacherFirstName: teacher.firstName,
      teacherLastName: teacher.lastName,
      classroomName: classroom.name,
    })
    .from(session)
    .innerJoin(module_, eq(session.moduleId, module_.id))
    .innerJoin(teacher, eq(session.teacherId, teacher.id))
    .innerJoin(classroom, eq(session.classroomId, classroom.id))
    .where(and(...conditions))
    .orderBy(session.date, 'asc')
    .orderBy(session.startTime, 'asc');

  return results.map(r => ({
    ...r,
    teacherName: `${r.teacherFirstName} ${r.teacherLastName}`,
    classroomName: r.classroomName || 'N/A',
  }));
}

  // ─── PRIVATE: Conflict Check ────────────────────
  async _checkConflicts(classroomId, teacherId, date, startTime, endTime, excludeSessionId = null) {
    const db = getDb();

    // Check classroom conflicts
    const classroomConditions = [
      eq(session.classroomId, classroomId),
      eq(session.date, date),
      not(eq(session.status, 'cancelled')),
      sql`${startTime} < ${session.endTime}`,
      sql`${endTime} > ${session.startTime}`
    ];
    if (excludeSessionId) {
      classroomConditions.push(not(eq(session.id, excludeSessionId)));
    }
    const classroomConflict = await db
      .select()
      .from(session)
      .where(and(...classroomConditions))
      .limit(1);
    if (classroomConflict.length > 0) {
      return `Classroom ${classroomId} is already booked on ${date} at ${startTime}-${endTime}`;
    }

    // Check teacher conflicts
    const teacherConditions = [
      eq(session.teacherId, teacherId),
      eq(session.date, date),
      not(eq(session.status, 'cancelled')),
      sql`${startTime} < ${session.endTime}`,
      sql`${endTime} > ${session.startTime}`
    ];
    if (excludeSessionId) {
      teacherConditions.push(not(eq(session.id, excludeSessionId)));
    }
    const teacherConflict = await db
      .select()
      .from(session)
      .where(and(...teacherConditions))
      .limit(1);
    if (teacherConflict.length > 0) {
      return `Teacher ${teacherId} is already booked on ${date} at ${startTime}-${endTime}`;
    }

    return null;
  }
}