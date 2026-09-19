import { BaseRepository } from './base.repository.js';
import { employeePayment } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export class EmployeePaymentRepository extends BaseRepository {
  constructor() {
    super(employeePayment, ['notes']);
  }

  async findByEmployee(employeeId) {
    return this.findAll({
      where: { employeeId },
      orderBy: 'createdAt',
      orderDir: 'desc',
    });
  }

  async findPendingByEmployee(employeeId) {
    return this.findAll({
      where: { employeeId, status: 'pending' },
      orderBy: 'createdAt',
      orderDir: 'desc',
    });
  }

  async findAllPending() {
    return this.findAll({
      where: { status: 'pending' },
      orderBy: 'createdAt',
      orderDir: 'desc',
    });
  }

  async findPaidByDateRange(startDate, endDate) {
    const db = this.db();
    return await db
      .select()
      .from(employeePayment)
      .where(
        and(
          eq(employeePayment.status, 'paid'),
          sql`date(${employeePayment.paidAt}) >= ${startDate}`,
          sql`date(${employeePayment.paidAt}) <= ${endDate}`
        )
      )
      .orderBy(employeePayment.paidAt, 'desc');
  }
}