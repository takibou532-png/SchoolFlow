// src/main/repositories/subject.repository.js
import { BaseRepository } from './base.repository.js'
import { subject } from '../db/index.js'

export class SubjectRepository extends BaseRepository {
  constructor() {
    super(subject, ['name'])
  }

  async findWithModules(subjectId) {
    const { module_ } = await import('../db/index.js')
    const db = this.db()
    
    return await db
      .select()
      .from(module_)
      .where(eq(module_.subjectId, subjectId))
      .where(eq(module_.isActive, true))
  }
}