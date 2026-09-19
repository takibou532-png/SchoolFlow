// src/main/services/classroom.service.js
import { BaseService } from './base.service.js';
import { ClassroomRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { module_, session } from '../db/index.js';
import { eq, or, sql ,count,and} from 'drizzle-orm';

export class ClassroomService extends BaseService {
  constructor() {
    super(new ClassroomRepository());
  }

  // ─── CREATE ─────────────────────────────
  async createClassroom(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Classroom name is required');
    }
    return this.repository.create({
      name: data.name.trim(),
      capacity: data.capacity || null,
      isActive: true
    });
  }

  // ─── UPDATE ─────────────────────────────
  async updateClassroom(id, data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Classroom name is required');
    }
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Classroom not found');
    return this.repository.update(id, {
      name: data.name.trim(),
      capacity: data.capacity || null
    });
  }

  // ─── SOFT DELETE ──────────────────────────
async deleteClassroom(id) {
  const db = getDb();
  const modulesResult = await db
    .select({ count: count() })
    .from(module_)
    .where(eq(module_.classroomId, id));
  if (Number(modulesResult[0]?.count || 0) > 0) {
    throw new Error('Cannot delete classroom: it is assigned to one or more modules');
  }
  const sessionsResult = await db
    .select({ count: count() })
    .from(session)
    .where(eq(session.classroomId, id));
  if (Number(sessionsResult[0]?.count || 0) > 0) {
    throw new Error('Cannot delete classroom: it is used in one or more sessions');
  }
  return this.repository.update(id, { isActive: false });
}

  // ─── RESTORE ─────────────────────────────
  async restoreClassroom(id) {
    return this.repository.update(id, { isActive: true });
  }

  // ─── GET ALL (active only) ──────────────
  async getAllClassrooms(options = {}) {
    return this.repository.findAll({
      ...options,
      where: { ...(options.where || {}), isActive: true }
    });
  }

  // ─── GET BY ID (any status) ─────────────
  async getClassroom(id) {
    return this.repository.findById(id);
  }
}