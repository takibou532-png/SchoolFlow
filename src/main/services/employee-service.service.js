import { BaseService } from './base.service.js';
import { EmployeePaymentRepository, EmployeeRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { employeePayment, employee } from '../db/index.js';
import { eq, and,desc,asc } from 'drizzle-orm';

export class EmployeePaymentService extends BaseService {
  constructor() {
    super(new EmployeePaymentRepository());
    this.employeeRepo = new EmployeeRepository();
  }

  // ─── Helper: format date ──────────────────────────
  _formatDate(dateStr) {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  }

  async createPayment(data) {
    if (!data.employeeId || data.amount == null || data.amount <= 0) {
      throw new Error('Employee ID and valid amount are required');
    }
    const employee = await this.employeeRepo.findById(data.employeeId);
    if (!employee) throw new Error('Employee not found');
    if (!employee.isActive) throw new Error('Cannot add payment to inactive employee');

    const created = await this.repository.create({
      employeeId: data.employeeId,
      amount: parseFloat(data.amount),
      status: 'pending',
      createdAt: new Date().toISOString(),
      paidAt: null,
      notes: data.notes || null,
    });
    return {
      ...created,
      createdAt: this._formatDate(created.createdAt),
    };
  }

  async updatePayment(id, data) {
    const payment = await this.repository.findById(id);
    if (!payment) throw new Error('Payment not found');

    const updateData = {};
    if (data.amount !== undefined) {
      if (data.amount <= 0) throw new Error('Amount must be positive');
      updateData.amount = parseFloat(data.amount);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }
    const updated = await this.repository.update(id, updateData);
    return {
      ...updated,
      createdAt: this._formatDate(updated.createdAt),
      paidAt: this._formatDate(updated.paidAt),
    };
  }

  async markAsPaid(id, paidAt = null) {
    const payment = await this.repository.findById(id);
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'paid') throw new Error('Payment is already paid');

    const paidDate = paidAt || new Date().toISOString();
    const updated = await this.repository.update(id, {
      status: 'paid',
      paidAt: paidDate,
    });
    return {
      ...updated,
      createdAt: this._formatDate(updated.createdAt),
      paidAt: this._formatDate(updated.paidAt),
    };
  }

  async deletePayment(id) {
    const payment = await this.repository.findById(id);
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'paid') {
      throw new Error('Cannot delete a paid payment');
    }
    return this.repository.delete(id);
  }

  async getAllPayments(options = {}) {
  const db = getDb();
  let query = db
    .select({
      id: employeePayment.id,
      employeeId: employeePayment.employeeId,
      amount: employeePayment.amount,
      status: employeePayment.status,
      createdAt: employeePayment.createdAt,
      paidAt: employeePayment.paidAt,
      notes: employeePayment.notes,
      employeeFullName: employee.fullName,
      employeePhone: employee.phone,
      employeeEmail: employee.email,
    })
    .from(employeePayment)
    .leftJoin(employee, eq(employeePayment.employeeId, employee.id));

  // Apply filters
  if (options.where) {
    for (const [key, value] of Object.entries(options.where)) {
      if (key === 'employeeId') {
        query = query.where(eq(employeePayment.employeeId, value));
      } else if (key === 'status') {
        query = query.where(eq(employeePayment.status, value));
      }
    }
  }

  // Order
  const orderBy = options.orderBy || 'createdAt';
  const orderDir = options.orderDir === 'asc' ? asc : desc;
  query = query.orderBy(orderDir(employeePayment[orderBy]));

  const results = await query;
  return results.map(r => ({
    ...r,
    employee: {
      fullName: r.employeeFullName,
      phone: r.employeePhone,
      email: r.employeeEmail,
    },
    createdAt: this._formatDate(r.createdAt),
    paidAt: this._formatDate(r.paidAt),
  }));
}

// ─── GET PAYMENTS BY EMPLOYEE ──────────────────────
async getPaymentsByEmployee(employeeId) {
  const payments = await this.getAllPayments({
    where: { employeeId },
    orderBy: 'createdAt',
    orderDir: 'desc',
  });
  return payments;
}

  async getPayment(id) {
    const payment = await this.repository.findById(id);
    if (!payment) return null;
    return {
      ...payment,
      createdAt: this._formatDate(payment.createdAt),
      paidAt: this._formatDate(payment.paidAt),
    };
  }

  async getTotalPaidForPeriod(startDate, endDate) {
    const db = getDb();
    const result = await db
      .select({
        total: sql`sum(${employeePayment.amount})`,
      })
      .from(employeePayment)
      .where(
        and(
          eq(employeePayment.status, 'paid'),
          gte(sql`date(${employeePayment.paidAt})`, startDate),
          lte(sql`date(${employeePayment.paidAt})`, endDate)
        )
      );
    return Number(result[0]?.total || 0);
  }
}