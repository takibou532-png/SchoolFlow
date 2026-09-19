import { BaseService } from './base.service.js';
import { TeacherRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { module_, course } from '../db/index.js';
import { eq, and, sql, count } from 'drizzle-orm';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs';
export class TeacherService extends BaseService {
  constructor() {
    super(new TeacherRepository());
  }


  // ─── PRIVATE: Save avatar file ─────────────────────
async _saveAvatarFile(file) {
  const userDataDir = app.getPath('userData');
  const avatarsDir = join(userDataDir, 'avatars');
  if (!existsSync(avatarsDir)) {
    mkdirSync(avatarsDir, { recursive: true });
  }
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `avatar_${Date.now()}.${ext}`;
  const destPath = join(avatarsDir, fileName);
  copyFileSync(file.path, destPath);
  return destPath;
}

// ─── PRIVATE: Get avatar as base64 ──────────────────
async _getAvatarData(teacherId) {
  const teacher = await this.repository.findById(teacherId);
  if (!teacher || !teacher.avatarPath) return null;
  try {
    const data = readFileSync(teacher.avatarPath);
    const ext = teacher.avatarPath.split('.').pop().toLowerCase();
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    return `data:${mimeType};base64,${data.toString('base64')}`;
  } catch (e) {
    console.error('Failed to read avatar:', e);
    return null;
  }
}

// ─── Public: Get avatar for a teacher ──────────────
async getAvatar(teacherId) {
  return this._getAvatarData(teacherId);
}

  // ─── CREATE ─────────────────────────────────────────
async createTeacher(data) {
  if (!data.firstName || !data.lastName) {
    throw new Error('First name and last name are required');
  }
  let avatarPath = null;
  if (data.avatarFile && data.avatarFile.path) {
    avatarPath = await this._saveAvatarFile(data.avatarFile);
    delete data.avatarFile;
  }
  const teacherData = {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    phone: data.phone || null,
    email: data.email || null,
    paymentPercentage: data.paymentPercentage || 70,
    isActive: true,
    avatarPath,
    createdAt: new Date().toISOString(),
  };
  return this.repository.create(teacherData);
}

async updateTeacher(id, data) {
  const existing = await this.repository.findById(id);
  if (!existing) throw new Error('Teacher not found');
  const updateData = {};
  if (data.avatarFile && data.avatarFile.path) {
    const newPath = await this._saveAvatarFile(data.avatarFile);
    updateData.avatarPath = newPath;
    delete data.avatarFile;
  }
  const allowed = ['firstName', 'lastName', 'phone', 'email', 'paymentPercentage', 'isActive'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }
  return this.repository.update(id, updateData);
}

  // ─── UPDATE ─────────────────────────────────────────
async updateTeacher(id, data) {
  const existing = await this.repository.findById(id);
  if (!existing) throw new Error('Teacher not found');
  const updateData = {};
  if (data.avatarFile && data.avatarFile.path) {
    const newPath = await this._saveAvatarFile(data.avatarFile);
    updateData.avatarPath = newPath;
    delete data.avatarFile;
  }
  const allowed = ['firstName', 'lastName', 'phone', 'email', 'paymentPercentage', 'isActive'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }
  return this.repository.update(id, updateData);
}

  // ─── SOFT DELETE ────────────────────────────────────
async deleteTeacher(id) {
  const db = getDb();
  // Check if teacher is assigned to any active module or course
  const modulesResult = await db
    .select({ count: count() })
    .from(module_)
    .where(eq(module_.teacherId, id));
  if (Number(modulesResult[0]?.count || 0) > 0) {
    throw new Error('Cannot delete teacher: they are assigned to one or more active modules');
  }
  const coursesResult = await db
    .select({ count: count() })
    .from(course)
    .where(eq(course.teacherId, id));
  if (Number(coursesResult[0]?.count || 0) > 0) {
    throw new Error('Cannot delete teacher: they are assigned to one or more active courses');
  }
  return this.repository.update(id, { isActive: false });
}

  // ─── RESTORE ────────────────────────────────────────
  async restoreTeacher(id) {
    return this.repository.update(id, { isActive: true });
  }

  // ─── GET ALL (active only) ─────────────────────────
  async getAllTeachers(options = {}) {
    return this.repository.findAll({
      ...options,
      where: { ...(options.where || {}), isActive: true }
    });
  }

  // ─── GET BY ID ──────────────────────────────────────
  async getTeacher(id) {
    return this.repository.findById(id);
  }
}