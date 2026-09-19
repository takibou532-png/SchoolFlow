// src/main/repositories/school.repository.js
import { BaseRepository } from './base.repository.js';
import { school } from '../db/index.js';

export class SchoolRepository extends BaseRepository {
  constructor() {
    super(school, ['name']);
  }

    async getSchool() {
    const schools = await this.repository.findAll({ limit: 1 });
    return schools[0] || null;
  }

  async createSchool(data) {
    return this.repository.create(data);
  }

  async updateSchool(id, data) {
    if (data.logoFile && data.logoFile.path) {
      const newLogoPath = await this._saveLogoFile(data.logoFile);
      data.logoPath = newLogoPath;
      delete data.logoFile;
    }
    return this.repository.update(id, data);
  }

  async _saveLogoFile(file) {
    const userDataDir = app.getPath('userData');
    const logosDir = join(userDataDir, 'logos');
    if (!existsSync(logosDir)) {
      mkdirSync(logosDir, { recursive: true });
    }
    const ext = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${ext}`;
    const destPath = join(logosDir, fileName);
    copyFileSync(file.path, destPath);
    return destPath;
  }

}