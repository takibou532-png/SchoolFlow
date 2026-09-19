// src/main/services/module.service.js
import { BaseService } from './base.service.js';
import { ModuleRepository } from '../repositories/module.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { TeacherRepository, SubjectRepository, ClassroomRepository, EnrollmentRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { module_, session, enrollment, subject, teacher } from '../db/index.js';
import { DAY_MAP, VALID_DAYS } from '../utils/day-mapping.js';
import { TeacherAttendanceService } from './teacher-attendance.service.js';
import { InvoiceService } from './invoice.service.js';
import { and, eq, gte, sql, not } from 'drizzle-orm';

export class ModuleService extends BaseService {
  constructor() {
    super(new ModuleRepository());
    this.sessionRepo = new SessionRepository();
    this.teacherRepo = new TeacherRepository();
    this.subjectRepo = new SubjectRepository();
    this.classroomRepo = new ClassroomRepository();
    this.teacherAttendanceService = new TeacherAttendanceService();
     this.invoiceService = new InvoiceService();
     this.enrollmentRepo = new EnrollmentRepository();
  }

  /**
   * Create a new module and generate all sessions for the period
   * @param {Object} dto - module data with schedules
   * @returns {Promise<{ module, sessions }>}
   */
  async createModuleWithSessions(dto) {
    // ---- 1. Validate required fields ----
    const required = [
      'subjectId', 'teacherId', 'level', 'name',
      'monthlyPrice', 'sessionPrice', 'startDate', 'endDate', 'schedules'
    ];
    for (const field of required) {
      if (dto[field] === undefined || dto[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    if (!Array.isArray(dto.schedules) || dto.schedules.length === 0) {
      throw new Error('At least one schedule entry is required');
    }

    // ---- 2. Validate referenced entities exist ----
    const teacherRow = await this.teacherRepo.findById(dto.teacherId);
    if (!teacherRow || !teacherRow.isActive) {
      throw new Error('Teacher not found or inactive');
    }
    const subjectRow = await this.subjectRepo.findById(dto.subjectId);
    if (!subjectRow) throw new Error('Subject not found');

    // ---- 3. Validate date range ----
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start) || isNaN(end) || start > end) {
      throw new Error('Invalid date range – startDate must be before endDate');
    }

    // ---- 4. Validate schedule entries (each must have classroomId) ----
    // scheduleEntries[i].slotIndex === i, matching the order the caller sent schedules in.
    // This slotIndex is stamped onto every generated session so later schedule updates
    // can target "the session that came from schedule entry #i" unambiguously.
    const scheduleEntries = [];
    for (let i = 0; i < dto.schedules.length; i++) {
      const s = dto.schedules[i];
      const day = s.day?.toUpperCase();
      if (!VALID_DAYS.includes(day)) {
        throw new Error(`Invalid day: ${s.day}. Must be one of ${VALID_DAYS.join(', ')}`);
      }
      if (!s.startTime || !s.endTime) {
        throw new Error('Each schedule must have startTime and endTime');
      }
      if (!s.classroomId) {
        throw new Error('Each schedule must have a classroomId');
      }
      // Validate classroom exists
      const classroom = await this.classroomRepo.findById(s.classroomId);
      if (!classroom) {
        throw new Error(`Classroom with id ${s.classroomId} not found`);
      }
      // Validate time format
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(s.startTime) || !timeRegex.test(s.endTime)) {
        throw new Error('Invalid time format. Use HH:mm');
      }
      if (s.startTime >= s.endTime) {
        throw new Error('startTime must be before endTime');
      }
      scheduleEntries.push({
        slotIndex: i,
        day: day,
        dayNumber: DAY_MAP[day],
        startTime: s.startTime,
        endTime: s.endTime,
        classroomId: s.classroomId
      });
    }

    // ---- 5. Compute sessionsPerMonth = number of schedule entries * 4 ----
    // One cycle (month) = each schedule entry occurring 4 times, regardless of
    // whether two entries land on the same weekday.
    const sessionsPerMonth = dto.schedules.length * 4;

    // ---- 6. Generate sessions ----
    const { sessions } = this._generateSessions(
      start,
      end,
      scheduleEntries,
      dto.teacherId
    );
    if (sessions.length === 0) {
      throw new Error('No sessions generated – check schedule and date range');
    }

    // ---- 7. Insert module and sessions in a transaction ----
    // NOTE: better-sqlite3's Drizzle driver runs transactions SYNCHRONOUSLY.
    // The callback must not be `async` and must not contain `await` — every
    // Drizzle call inside it (insert/update/select/.returning()) already
    // returns its result directly, not a Promise, when run inside
    // db.transaction() on this driver. All async lookups happened above,
    // before this point.
    const db = getDb();
    const moduleData = {
      name: dto.name,
      level: dto.level,
      subjectId: dto.subjectId,
      teacherId: dto.teacherId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      monthlyPrice: dto.monthlyPrice,
      sessionPrice: dto.sessionPrice,
      sessionsPerMonth: sessionsPerMonth,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const result = db.transaction((tx) => {
      const [newModule] = tx.insert(module_).values(moduleData).returning().all();

      const sessionsWithModule = sessions.map(s => ({
        ...s,
        moduleId: newModule.id
      }));
      const insertedSessions = tx.insert(session).values(sessionsWithModule).returning().all();

      return { module: newModule, sessions: insertedSessions };
    });

    return result;
  }

  async getModulesWithDetails(options = {}) {
    const db = getDb();
    let query = db
      .select({
        id: module_.id,
        name: module_.name,
        level: module_.level,
        subjectId: module_.subjectId,
        teacherId: module_.teacherId,
        startDate: module_.startDate,
        endDate: module_.endDate,
        monthlyPrice: module_.monthlyPrice,
        sessionPrice: module_.sessionPrice,
        sessionsPerMonth: module_.sessionsPerMonth,
        isActive: module_.isActive,
        createdAt: module_.createdAt,
        subjectName: subject.name,
        teacherFirstName: teacher.firstName,
        teacherLastName: teacher.lastName,
        studentCount: sql`count(${enrollment.id})`
      })
      .from(module_)
      .leftJoin(subject, eq(module_.subjectId, subject.id))
      .leftJoin(teacher, eq(module_.teacherId, teacher.id))
      .leftJoin(enrollment, eq(module_.id, enrollment.moduleId))
      .groupBy(module_.id);

    const conditions = [];

    // Apply search if provided
    if (options.search) {
      const search = `%${options.search}%`;
      conditions.push(sql`${module_.name} LIKE ${search} OR ${module_.level} LIKE ${search} OR ${subject.name} LIKE ${search}`);
    }

    // Apply status filter
    if (options.where && options.where.isActive !== undefined) {
      conditions.push(eq(module_.isActive, options.where.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  // ─── GET MODULE WITH DETAILS (subject, teacher, student count) ──
  async getModuleWithDetails(moduleId) {
    const db = getDb();

    const result = await db
      .select({
        module: module_,
        subject: subject,
        teacher: teacher,
        studentCount: sql`count(${enrollment.id})`
      })
      .from(module_)
      .where(eq(module_.id, moduleId))
      .leftJoin(subject, eq(module_.subjectId, subject.id))
      .leftJoin(teacher, eq(module_.teacherId, teacher.id))
      .leftJoin(enrollment, eq(module_.id, enrollment.moduleId))
      .groupBy(module_.id);

    return result[0] || null;
  }

  /**
   * Generates session objects with monthly‑reset index, per-session classroom,
   * and the slotIndex of the schedule entry each session came from.
   * @private
   */
_generateSessions(startDate, endDate, scheduleEntries, teacherId) {
  const sessions = [];
  
  // ─── Calculate sessionsPerMonth from schedule ──
  const uniqueDays = new Set(scheduleEntries.map(s => s.day));
  const sessionsPerMonth = uniqueDays.size * 4;
  
  let sessionCounter = 0; // Global counter across ALL sessions
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const matching = scheduleEntries.find(s => s.dayNumber === dayOfWeek);
    if (matching) {
      sessionCounter++;
      // Cycle: 1,2,3,4,1,2,3,4...
      const idx = ((sessionCounter - 1) % sessionsPerMonth) + 1;
      
      sessions.push({
        date: current.toISOString().split('T')[0],
        startTime: matching.startTime,
        endTime: matching.endTime,
        teacherId: teacherId,
        classroomId: matching.classroomId,
        status: 'scheduled',
        sessionIndex: idx,
        slotIndex: matching.slotIndex,   // ← preserved
        dayOfWeek: matching.dayNumber,
        isAdditional: false,
        sessionPrice: null
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return { sessions };
}

  async getModules(options = {}) {
    return this.repository.findAll(options);
  }

  // ─── ARCHIVE MODULE ─────────────────────────────
async archiveModule(moduleId) {
  const db = getDb();
  const module = await this.repository.findById(moduleId);
  if (!module) throw new Error('Module not found');
  if (!module.isActive) throw new Error('Module is already archived');

  const today = new Date().toISOString().split('T')[0];
  const { session } = await import('../db/index.js');

  // 1. Deactivate module and cancel future sessions
  const result = db.transaction(() => {
    const updated = this.repository.update(moduleId, { isActive: false });

    const updatedSessions = db
      .update(session)
      .set({ status: 'cancelled' })
      .where(and(eq(session.moduleId, moduleId), gte(session.date, today)))
      .returning()
      .all();   // ← executes synchronously, returns the array

    return { module: updated, sessions: updatedSessions };
  });

  // 2. Update teacher attendance for canceled sessions
  for (const sess of result.sessions) {
    await this.teacherAttendanceService.updateAttendanceOnSessionStatusChange(sess.id, 'cancelled');
  }

  // 3. Cancel all pending/overdue invoices for active enrollments
  const enrollments = await this.enrollmentRepo.findActiveByModule(moduleId);
  for (const enrollment of enrollments) {
    await this.invoiceService.cancelInvoicesForEnrollment(
      enrollment.id,
      `Module "${module.name}" archived`
    );
  }

  return result;
}

  // ─── UPDATE SPECIFIC SCHEDULE SLOT(S) ───────────
  /**
   * Updates one or more schedule slots of a module going forward.
   * Each entry in `slotUpdates` targets a single existing slot by slotIndex
   * (the position it had in the original createModuleWithSessions schedules
   * array) and edits only the future, non-additional sessions that were
   * generated from that slot. Sessions from slots not included in
   * `slotUpdates` are left untouched.
   *
   * @param {number} moduleId
   * @param {Array<{ slotIndex: number, day?: string, startTime: string, endTime: string, classroomId: number }>} slotUpdates
   */
  async updateModuleSchedule(moduleId, slotUpdates) {
    const db = getDb();

    if (!Array.isArray(slotUpdates) || slotUpdates.length === 0) {
      throw new Error('At least one slot update is required');
    }

    // 1. Validate module
    const module = await this.repository.findById(moduleId);
    if (!module) throw new Error('Module not found');
    if (!module.isActive) throw new Error('Cannot update schedule of an archived module');

    const today = new Date().toISOString().split('T')[0];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    // 2. Validate each slot update and load the future sessions it targets
    const plans = [];
    for (const su of slotUpdates) {
      if (su.slotIndex === undefined || su.slotIndex === null) {
        throw new Error('Each slot update must include slotIndex');
      }
      if (!su.startTime || !su.endTime) {
        throw new Error('Each slot update must have startTime and endTime');
      }
      const timeOk = timeRegex.test(su.startTime) && timeRegex.test(su.endTime);
      if (!timeOk) {
        throw new Error('Invalid time format. Use HH:mm');
      }
      if (su.startTime >= su.endTime) {
        throw new Error('startTime must be before endTime');
      }
      if (!su.classroomId) {
        throw new Error('Each slot update must have a classroomId');
      }
      const classroom = await this.classroomRepo.findById(su.classroomId);
      if (!classroom) {
        throw new Error(`Classroom ${su.classroomId} not found`);
      }

      let newDayNumber = null;
      if (su.day !== undefined && su.day !== null) {
        const day = su.day.toUpperCase();
        if (!VALID_DAYS.includes(day)) {
          throw new Error(`Invalid day: ${su.day}. Must be one of ${VALID_DAYS.join(', ')}`);
        }
        newDayNumber = DAY_MAP[day];
      }

      // Future, non-additional sessions belonging to this slot
      const targetSessions = await db
        .select()
        .from(session)
        .where(
          and(
            eq(session.moduleId, moduleId),
            eq(session.slotIndex, su.slotIndex),
            eq(session.isAdditional, false),
            gte(session.date, today)
          )
        )
        .orderBy(session.date, 'asc');

      if (targetSessions.length === 0) {
        throw new Error(`No future sessions found for slotIndex ${su.slotIndex}`);
      }

      plans.push({
        slotIndex: su.slotIndex,
        startTime: su.startTime,
        endTime: su.endTime,
        classroomId: su.classroomId,
        newDayNumber, // null means "day unchanged"
        targetSessions
      });
    }

    // 3. Build the concrete per-session changes (date shift + new time/room)
    //    and check conflicts for every one of them before writing anything.
    const changes = [];
    for (const plan of plans) {
      for (const sess of plan.targetSessions) {
        let newDate = sess.date;
        let newDayOfWeek = sess.dayOfWeek;

        if (plan.newDayNumber !== null && plan.newDayNumber !== sess.dayOfWeek) {
          const offset = plan.newDayNumber - sess.dayOfWeek; // shift within the same week
          const d = new Date(sess.date);
          d.setDate(d.getDate() + offset);
          newDate = d.toISOString().split('T')[0];
          newDayOfWeek = plan.newDayNumber;
        }

        changes.push({
          sessionId: sess.id,
          date: newDate,
          startTime: plan.startTime,
          endTime: plan.endTime,
          dayOfWeek: newDayOfWeek,
          classroomId: plan.classroomId
        });
      }
    }

    for (const change of changes) {
      // Classroom conflict
      const classroomConflict = await db
        .select()
        .from(session)
        .where(
          and(
            eq(session.classroomId, change.classroomId),
            eq(session.date, change.date),
            not(eq(session.id, change.sessionId)),
            not(eq(session.status, 'cancelled')),
            sql`${change.startTime} < ${session.endTime}`,
            sql`${change.endTime} > ${session.startTime}`
          )
        )
        .limit(1);
      if (classroomConflict.length > 0) {
        throw new Error(`Classroom ${change.classroomId} conflict on ${change.date} at ${change.startTime}-${change.endTime}`);
      }

      // Teacher conflict
      const teacherConflict = await db
        .select()
        .from(session)
        .where(
          and(
            eq(session.teacherId, module.teacherId),
            eq(session.date, change.date),
            not(eq(session.id, change.sessionId)),
            not(eq(session.status, 'cancelled')),
            sql`${change.startTime} < ${session.endTime}`,
            sql`${change.endTime} > ${session.startTime}`
          )
        )
        .limit(1);
      if (teacherConflict.length > 0) {
        throw new Error(`Teacher conflict on ${change.date} at ${change.startTime}-${change.endTime}`);
      }
    }

    // 4. Apply all changes in a single transaction, in place (sessionIndex,
    //    id, and slotIndex are never touched, only date/time/classroom).
    // better-sqlite3: synchronous callback only, use tx + .run()/.all().
    return db.transaction((tx) => {
      const updatedSessions = [];
      for (const change of changes) {
        const [updated] = tx
          .update(session)
          .set({
            date: change.date,
            startTime: change.startTime,
            endTime: change.endTime,
            dayOfWeek: change.dayOfWeek,
            classroomId: change.classroomId
          })
          .where(eq(session.id, change.sessionId))
          .returning()
          .all();
        updatedSessions.push(updated);
      }
      return updatedSessions;
    });
  }

  // ─── GET SINGLE MODULE ──────────────────────────
  async getModule(id) {
    const module = await this.repository.findById(id);
    if (!module) throw new Error('Module not found');
    return module;
  }

  // ─── GET MODULE STUDENTS (flattened DTO) ────────
 async getModuleStudents(moduleId) {
  const rows = await this.repository.getModuleStudents(moduleId);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  };

  return rows.map(r => ({
    id: r.student.id,
    firstName: r.student.firstName,
    lastName: r.student.lastName,
    phoneNumber : r.student.guardianPhone,
    guardianName: r.student.guardianName,
    enrolledAt: formatDate(r.enrolledAt),
    isActive: r.isActive
  }));
}

  // ─── GET MODULE REVENUE ─────────────────────────
  async getMonthlyRevenue(moduleId) {
    return this.repository.getMonthlyRevenue(moduleId);
  }

  // ─── GET MODULE SCHEDULE SLOTS (for edit form) ──
  // One row per distinct slotIndex, built from the earliest future
  // session in that slot, or the most recent past session if none
  // are left in the future. Used to prefill the update-schedule form.
  async getModuleScheduleSlots(moduleId) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const allSessions = await db
      .select()
      .from(session)
      .where(and(eq(session.moduleId, moduleId), eq(session.isAdditional, false)))
      .orderBy(session.date, 'asc');

    const bySlot = new Map();
    for (const s of allSessions) {
      if (s.slotIndex === null || s.slotIndex === undefined) continue;
      const existing = bySlot.get(s.slotIndex);
      const isFuture = s.date >= today;

      if (!existing) {
        bySlot.set(s.slotIndex, { session: s, hasFuture: isFuture });
        continue;
      }
      // Prefer the earliest FUTURE session for this slot; if we already
      // have a future one, keep it. Otherwise keep pushing forward to the
      // most recent (last) session so a slot with no future left still
      // reflects its latest known values.
      if (isFuture && !existing.hasFuture) {
        bySlot.set(s.slotIndex, { session: s, hasFuture: true });
      } else if (!existing.hasFuture && !isFuture) {
        bySlot.set(s.slotIndex, { session: s, hasFuture: false });
      }
    }

    const dayNames = Object.keys(DAY_MAP);
    const slots = [];
    for (const [slotIndex, entry] of bySlot.entries()) {
      const s = entry.session;
      const dayName = dayNames.find(d => DAY_MAP[d] === s.dayOfWeek) || null;
      slots.push({
        slotIndex,
        day: dayName,
        startTime: s.startTime,
        endTime: s.endTime,
        classroomId: s.classroomId,
        hasFutureSessions: entry.hasFuture
      });
    }

    slots.sort((a, b) => a.slotIndex - b.slotIndex);
      return this._buildSlotsFromSessions(allSessions, today);
  }



    // ─── PRIVATE: group a list of sessions into one row per slotIndex ──
  _buildSlotsFromSessions(sessions, today) {
    const bySlot = new Map();
    for (const s of sessions) {
      if (s.slotIndex === null || s.slotIndex === undefined) continue;
      const existing = bySlot.get(s.slotIndex);
      const isFuture = s.date >= today;

      if (!existing) {
        bySlot.set(s.slotIndex, { session: s, hasFuture: isFuture });
        continue;
      }
      if (isFuture && !existing.hasFuture) {
        bySlot.set(s.slotIndex, { session: s, hasFuture: true });
      } else if (!existing.hasFuture && !isFuture) {
        bySlot.set(s.slotIndex, { session: s, hasFuture: false });
      }
    }

    const dayNames = Object.keys(DAY_MAP);
    const slots = [];
    for (const [slotIndex, entry] of bySlot.entries()) {
      const s = entry.session;
      const dayName = dayNames.find(d => DAY_MAP[d] === s.dayOfWeek) || null;
      slots.push({
        slotIndex,
        day: dayName,
        startTime: s.startTime,
        endTime: s.endTime,
        classroomId: s.classroomId,
        hasFutureSessions: entry.hasFuture
      });
    }
    slots.sort((a, b) => a.slotIndex - b.slotIndex);
    return slots;
  }

    // ─── GET ALL MODULES WITH SCHEDULE SLOTS (for timetable view) ──
  async getAllModulesSchedule() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const modules = await db
      .select({
        id: module_.id,
        name: module_.name,
        level: module_.level,
        subjectName: subject.name,
        teacherFirstName: teacher.firstName,
        teacherLastName: teacher.lastName
      })
      .from(module_)
      .leftJoin(subject, eq(module_.subjectId, subject.id))
      .leftJoin(teacher, eq(module_.teacherId, teacher.id))
      .where(eq(module_.isActive, true));

    if (modules.length === 0) return [];

    const allSessions = await db
      .select()
      .from(session)
      .where(eq(session.isAdditional, false))
      .orderBy(session.date, 'asc');

    const sessionsByModule = new Map();
    for (const s of allSessions) {
      if (!sessionsByModule.has(s.moduleId)) sessionsByModule.set(s.moduleId, []);
      sessionsByModule.get(s.moduleId).push(s);
    }

    return modules.map(m => ({
      ...m,
      slots: this._buildSlotsFromSessions(sessionsByModule.get(m.id) || [], today)
    }));
  }
}