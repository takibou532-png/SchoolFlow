// src/main/repositories/course.repository.js
import { BaseRepository } from './base.repository.js';
import { course } from '../db/index.js';
import { eq } from 'drizzle-orm';

export class CourseRepository extends BaseRepository {
  constructor() {
    super(course, ['name', 'subjectName', 'level']);
  }

  async findActive() {
    return this.findAll({ where: { isActive: true } });
  }

  async findByTeacher(teacherId) {
    return this.findAll({ where: { teacherId } });
  }
  
}