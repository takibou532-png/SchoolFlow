import { BaseRepository } from './base.repository.js';
import { employee } from '../db/index.js';
import { eq } from 'drizzle-orm';

export class EmployeeRepository extends BaseRepository {
  constructor() {
    super(employee, ['fullName', 'phone', 'email']);
  }

  async findActive() {
    return this.findAll({ where: { isActive: true } });
  }

  async softDelete(id) {
    return this.update(id, { isActive: false });
  }

  async restore(id) {
    return this.update(id, { isActive: true });
  }
}