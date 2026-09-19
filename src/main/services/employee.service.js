import { BaseService } from './base.service.js';
import { EmployeeRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { employeePayment,employee } from '../db/index.js';
import { eq,and  } from 'drizzle-orm';

export class EmployeeService extends BaseService {
  constructor() {
    super(new EmployeeRepository());
  }

  // ─── Helper: format date ──────────────────────────
  _formatDate(dateStr) {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  }

  async createEmployee(data) {
    if (!data.fullName) throw new Error('Full name is required');
    const created = await this.repository.create({
      fullName: data.fullName.trim(),
      phone: data.phone || null,
      email: data.email || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    return {
      ...created,
      createdAt: this._formatDate(created.createdAt),
    };
  }

  async updateEmployee(id, data) {
    const employee = await this.repository.findById(id);
    if (!employee) throw new Error('Employee not found');

    const updateData = {};
    const allowed = ['fullName', 'phone', 'email'];
    for (const field of allowed) {
      if (data[field] !== undefined) {
        updateData[field] = field === 'fullName' ? data[field].trim() : data[field];
      }
    }
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }
    const updated = await this.repository.update(id, updateData);
    return {
      ...updated,
      createdAt: this._formatDate(updated.createdAt),
    };
  }

  async deleteEmployee(id) {
    const employee = await this.repository.findById(id);
    if (!employee) throw new Error('Employee not found');

    const db = getDb();
    // Check if employee has any pending payments
    const pendingPayments = await db
      .select()
      .from(employeePayment)
      .where(
        and(
          eq(employeePayment.employeeId, id),
          eq(employeePayment.status, 'pending')
        )
      )
      .limit(1);

    if (pendingPayments.length > 0) {
      throw new Error('Cannot delete employee: they have pending payments.');
    }

    // Soft delete (allow if only paid payments exist)
    return this.repository.softDelete(id);
  }

  async restoreEmployee(id) {
    const restored = await this.repository.restore(id);
    return {
      ...restored,
      createdAt: this._formatDate(restored.createdAt),
    };
  }

  async getAllEmployees(options = {}) {
    const employees = await this.repository.findAll({
      ...options,
      where: { ...(options.where || {}), isActive: true },
    });
    return employees.map(emp => ({
      ...emp,
      createdAt: this._formatDate(emp.createdAt),
    }));
  }

  async getEmployee(id) {
    const employee = await this.repository.findById(id);
    if (!employee) return null;
    return {
      ...employee,
      createdAt: this._formatDate(employee.createdAt),
    };
  }
}