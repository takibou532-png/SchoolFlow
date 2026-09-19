// src/main/services/subject.service.js
import { BaseService } from './base.service.js';
import { SubjectRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { module_ } from '../db/index.js';
import { eq, sql ,count,and} from 'drizzle-orm';

export class SubjectService extends BaseService {
  constructor() {
    super(new SubjectRepository());
  }

  // ─── CREATE ─────────────────────────────
  async createSubject(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Subject name is required');
    }
    return this.repository.create({ 
      name: data.name.trim(),
      isActive: true
    });
  }

  // ─── UPDATE ─────────────────────────────
  async updateSubject(id, data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Subject name is required');
    }
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Subject not found');
    return this.repository.update(id, { name: data.name.trim() });
  }

  // ─── SOFT DELETE ─────────────────────────────
 async deleteSubject(id) {
  const db = getDb();
  const result = await db
    .select({ count: count() })
    .from(module_)
    .where(eq(module_.subjectId, id));
  if (Number(result[0]?.count || 0) > 0) {
    throw new Error('Cannot delete subject: it is assigned to one or more modules');
  }
  return this.repository.update(id, { isActive: false });
}

  // ─── RESTORE ─────────────────────────────
  async restoreSubject(id) {
    return this.repository.update(id, { isActive: true });
  }

  // ─── GET ALL (active only) ──────────────
  async getAllSubjects(options = {}) {
    // Always filter for active subjects by default
    return this.repository.findAll({
      ...options,
      where: { ...(options.where || {}), isActive: true }
    });
  }

  // ─── GET BY ID (any status) ─────────────
  async getSubject(id) {
    return this.repository.findById(id);
  }
}