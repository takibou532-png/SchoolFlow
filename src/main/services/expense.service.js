import { BaseService } from './base.service.js';
import { ExpenseRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { expense } from '../db/index.js';
import { sql } from 'drizzle-orm';

export class ExpenseService extends BaseService {
  constructor() {
    super(new ExpenseRepository());
  }

  async getAllExpenses(options = {}) {
    return this.repository.findAll(options);
  }

  async getExpense(id) {
    return this.repository.findById(id);
  }

  async createExpense(data) {
    if (!data.name || data.amount === undefined || data.amount === null) {
      throw new Error('Name and amount are required');
    }
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return this.repository.create({
      name: data.name.trim(),
      amount: amount
    });
  }

  async updateExpense(id, data) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Expense not found');
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.amount !== undefined) {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Amount must be a positive number');
      updateData.amount = amount;
    }
    return this.repository.update(id, updateData);
  }

  async deleteExpense(id) {
    return this.repository.delete(id);
  }

  async getTotalExpenses(startDate, endDate) {
    const db = getDb();
    const result = await db
      .select({ total: sql`sum(${expense.amount})` })
      .from(expense)
      .where(
        and(
          gte(expense.createdAt, startDate),
          lte(expense.createdAt, endDate)
        )
      );
    return Number(result[0]?.total || 0);
  }
}