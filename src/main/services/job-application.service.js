import { BaseService } from './base.service.js';
import { JobApplicationRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { app } from 'electron';
import { join } from 'path';
import { jobApplication ,subject } from '../db/index.js';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { eq ,sql} from 'drizzle-orm';

export class JobApplicationService extends BaseService {
  constructor() {
    super(new JobApplicationRepository());
  }

  _formatDate(dateStr) {
  if (!dateStr) return null;
  return dateStr.split('T')[0];
}

// ─── GET APPLICATIONS BY SUBJECT ──────────────────
async getApplicationsBySubject(subjectId) {
  const db = getDb();
  const apps = await db
    .select({
      id: jobApplication.id,
      fullName: jobApplication.fullName,
      phone: jobApplication.phone,
      subjectId: jobApplication.subjectId,
      subjectName: subject.name,
      cvPath: jobApplication.cvPath,
      createdAt: jobApplication.createdAt,
    })
    .from(jobApplication)
    .innerJoin(subject, eq(jobApplication.subjectId, subject.id))
    .where(eq(jobApplication.subjectId, subjectId))
    .orderBy(jobApplication.createdAt, 'desc');

  return apps.map(app => ({
    ...app,
    createdAt: this._formatDate(app.createdAt),
  }));
}

  async createApplication(data) {
    if (!data.fullName || !data.phone || !data.subjectId) {
      throw new Error('Full name, phone, and subject are required');
    }

    const applicationData = {
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      subjectId: data.subjectId,
      cvPath: null,
    };

    // If a file is provided, save it and store the path
    if (data.cvFile && data.cvFile.path) {
      applicationData.cvPath = await this._saveCvFile(data.cvFile);
    }

    return this.repository.create(applicationData);
  }

  async updateApplication(id, data) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Application not found');

    const updateData = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.subjectId !== undefined) updateData.subjectId = data.subjectId;

    // If a new CV file is provided, replace the old one
    if (data.cvFile && data.cvFile.path) {
      const newCvPath = await this._saveCvFile(data.cvFile);
      updateData.cvPath = newCvPath;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    return this.repository.update(id, updateData);
  }

  async deleteApplication(id) {
    const application = await this.repository.findById(id);
    if (!application) throw new Error('Application not found');
    // Hard delete (no need to check dependencies)
    return this.repository.delete(id);
  }

async getApplications(options = {}) {
  const db = getDb();
  const { search } = options;

  let query = db
    .select({
      id: jobApplication.id,
      fullName: jobApplication.fullName,
      phone: jobApplication.phone,
      subjectId: jobApplication.subjectId,
      subjectName: subject.name,
      cvPath: jobApplication.cvPath,
      createdAt: jobApplication.createdAt,
    })
    .from(jobApplication)
    .leftJoin(subject, eq(jobApplication.subjectId, subject.id));

  if (search) {
    const term = `%${search}%`;
    query = query.where(
      sql`${jobApplication.fullName} LIKE ${term} OR ${jobApplication.phone} LIKE ${term}`
    );
  }

  const results = await query.orderBy(jobApplication.createdAt, 'desc');
  return results.map(app => ({
    ...app,
    createdAt: this._formatDate(app.createdAt),
  }));
}

  async getApplication(id) {
    return this.repository.findById(id);
  }

  // ─── CV File Handling ──────────────────────────────
  async _saveCvFile(file) {
    const userDataDir = app.getPath('userData');
    const cvsDir = join(userDataDir, 'cvs');
    if (!existsSync(cvsDir)) {
      mkdirSync(cvsDir, { recursive: true });
    }
    const fileName = `cv_${Date.now()}.pdf`;
    const destPath = join(cvsDir, fileName);
    copyFileSync(file.path, destPath);
    return destPath;
  }

  async getCvPath(id) {
    const application = await this.repository.findById(id);
    if (!application) throw new Error('Application not found');
    if (!application.cvPath) throw new Error('No CV attached');
    return application.cvPath;
  }
}