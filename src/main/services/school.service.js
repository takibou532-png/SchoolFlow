import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs';
import { BaseService } from './base.service.js';
import { SchoolRepository } from '../repositories/index.js';
import { getDb } from '../db/client.js';

import {
  invoice,
  enrollment,
  module_,
  course,
  courseEnrollment,
  teacher,
  payment,
  coursePayment,
  student,
  paymentInvoice,
  expense,
  employeePayment
} from '../db/index.js';
import { eq, and, gte, lte, sql, between, desc, asc } from 'drizzle-orm';

export class SchoolService extends BaseService {
  constructor() {
    super(new SchoolRepository());
  }

  // ─── Save stamp file ──────────────────────────────
async _saveStampFile(file) {
  const userDataDir = app.getPath('userData');
  const stampsDir = join(userDataDir, 'stamps');
  if (!existsSync(stampsDir)) {
    mkdirSync(stampsDir, { recursive: true });
  }
  const ext = file.name.split('.').pop();
  const fileName = `stamp_${Date.now()}.${ext}`;
  const destPath = join(stampsDir, fileName);
  copyFileSync(file.path, destPath);
  return destPath;
}

// ─── Get stamp as base64 ──────────────────────────
async getStampBase64() {
  const school = await this.getSchool();
  if (!school || !school.stampPath) return null;
  try {
    const data = readFileSync(school.stampPath);
    const ext = school.stampPath.split('.').pop().toLowerCase();
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    return `data:${mimeType};base64,${data.toString('base64')}`;
  } catch (e) {
    console.error('Failed to read stamp:', e);
    return null;
  }
}

  async getSchool() {
    const schools = await this.repository.findAll({ limit: 1 });
    return schools[0] || null;
  }

  async createSchool(data) {
    return this.repository.create(data);
  }

async updateSchool(id, data) {
  if (!data) {
    throw new Error('No update data provided');
  }

  if (data.logoFile && data.logoFile.path) {
    const newLogoPath = await this._saveLogoFile(data.logoFile);
    data.logoPath = newLogoPath;
    delete data.logoFile;
  }
  if (data.stampFile && data.stampFile.path) {
    const newStampPath = await this._saveStampFile(data.stampFile);
    data.stampPath = newStampPath;
    delete data.stampFile;
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
/**
 * Get comprehensive dashboard statistics
 * @param {Object} options
 * @param {string} options.period - 'current_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom'
 * @param {string} options.startDate - YYYY-MM-DD (for custom period)
 * @param {string} options.endDate - YYYY-MM-DD (for custom period)
 */
async getDashboardStats(options = {}) {
  const db = getDb();
  const { period = 'current_month', startDate, endDate } = options;

    const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ─── Calculate date range ──────────────────────
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (period) {
    case 'current_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_6_months':
      start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Custom period requires startDate and endDate');
      }
      start = new Date(startDate);
      end = new Date(endDate);
      break;
    default:
      throw new Error('Invalid period. Use: current_month, last_3_months, last_6_months, last_year, custom');
  }

  const startStr = formatLocalDate(start);
  const endStr = formatLocalDate(end);

  // ─── 1. Student Stats ──────────────────────────
  const studentStats = await db
    .select({
      total: sql`count(*)`,
      active: sql`sum(case when ${student.isActive} = 1 then 1 else 0 end)`,
      inactive: sql`sum(case when ${student.isActive} = 0 then 1 else 0 end)`
    })
    .from(student);

  // ─── 2. Module Stats ────────────────────────────
  const moduleStats = await db
    .select({
      total: sql`count(*)`,
      active: sql`sum(case when ${module_.isActive} = 1 then 1 else 0 end)`,
      archived: sql`sum(case when ${module_.isActive} = 0 then 1 else 0 end)`
    })
    .from(module_);

  // ─── 3. Course Stats ────────────────────────────
  const courseStats = await db
    .select({
      total: sql`count(*)`,
      active: sql`sum(case when ${course.isActive} = 1 then 1 else 0 end)`,
      archived: sql`sum(case when ${course.isActive} = 0 then 1 else 0 end)`
    })
    .from(course);

  // ─── 4. Teacher Stats ───────────────────────────
  const teacherStats = await db
    .select({
      total: sql`count(*)`,
      active: sql`sum(case when ${teacher.isActive} = 1 then 1 else 0 end)`,
      inactive: sql`sum(case when ${teacher.isActive} = 0 then 1 else 0 end)`
    })
    .from(teacher);

  // ─── 5. Invoice Financial Stats ──────────────────
  // NOTE: totalAmount/totalCount now EXCLUDE cancelled invoices entirely,
  // as if cancelled invoices don't exist. cancelledAmount/cancelledCount
  // are still reported separately for visibility, but are not folded into
  // any "total" figure.
  const invoiceStats = await db
    .select({
      totalAmount: sql`sum(case when ${invoice.status} != 'cancelled' then ${invoice.amount} else 0 end)`,
      paidAmount: sql`sum(case when ${invoice.status} = 'paid' then ${invoice.amount} else 0 end)`,
      pendingAmount: sql`sum(case when ${invoice.status} = 'pending' then ${invoice.amount} else 0 end)`,
      overdueAmount: sql`sum(case when ${invoice.status} = 'overdue' then ${invoice.amount} else 0 end)`,
      cancelledAmount: sql`sum(case when ${invoice.status} = 'cancelled' then ${invoice.amount} else 0 end)`,
      totalCount: sql`sum(case when ${invoice.status} != 'cancelled' then 1 else 0 end)`,
      paidCount: sql`sum(case when ${invoice.status} = 'paid' then 1 else 0 end)`,
      pendingCount: sql`sum(case when ${invoice.status} = 'pending' then 1 else 0 end)`,
      overdueCount: sql`sum(case when ${invoice.status} = 'overdue' then 1 else 0 end)`,
      cancelledCount: sql`sum(case when ${invoice.status} = 'cancelled' then 1 else 0 end)`
    })
    .from(invoice)
    .where(between(invoice.issueDate, startStr, endStr));

  // ─── 6. Teacher Payment Stats ──────────────────
 const regularPaymentStats = await db
  .select({
    totalAmount: sql`sum(case when ${payment.status} != 'cancelled' then ${payment.amount} else 0 end)`,
    paidAmount: sql`sum(case when ${payment.status} = 'paid' then ${payment.amount} else 0 end)`,
    pendingAmount: sql`sum(case when ${payment.status} = 'pending' then ${payment.amount} else 0 end)`,
    cancelledAmount: sql`sum(case when ${payment.status} = 'cancelled' then ${payment.amount} else 0 end)`,
    totalCount: sql`sum(case when ${payment.status} != 'cancelled' then 1 else 0 end)`,
    paidCount: sql`sum(case when ${payment.status} = 'paid' then 1 else 0 end)`,
    pendingCount: sql`sum(case when ${payment.status} = 'pending' then 1 else 0 end)`,
    cancelledCount: sql`sum(case when ${payment.status} = 'cancelled' then 1 else 0 end)`
  })
  .from(payment)
  .where(
    and(
      gte(sql`date(${payment.createdAt})`, startStr),
      lte(sql`date(${payment.createdAt})`, endStr)
    )
  );

const coursePaymentStats = await db
  .select({
    totalAmount: sql`sum(case when ${coursePayment.status} != 'cancelled' then ${coursePayment.amount} else 0 end)`,
    paidAmount: sql`sum(case when ${coursePayment.status} = 'paid' then ${coursePayment.amount} else 0 end)`,
    pendingAmount: sql`sum(case when ${coursePayment.status} = 'pending' then ${coursePayment.amount} else 0 end)`,
    cancelledAmount: sql`sum(case when ${coursePayment.status} = 'cancelled' then ${coursePayment.amount} else 0 end)`,
    totalCount: sql`sum(case when ${coursePayment.status} != 'cancelled' then 1 else 0 end)`,
    paidCount: sql`sum(case when ${coursePayment.status} = 'paid' then 1 else 0 end)`,
    pendingCount: sql`sum(case when ${coursePayment.status} = 'pending' then 1 else 0 end)`,
    cancelledCount: sql`sum(case when ${coursePayment.status} = 'cancelled' then 1 else 0 end)`
  })
  .from(coursePayment)
  .where(
    and(
      gte(sql`date(${coursePayment.createdAt})`, startStr),
      lte(sql`date(${coursePayment.createdAt})`, endStr)
    )
  );

  // ─── 7. School Revenue (Invoice - Teacher Share) ──
  // Excludes cancelled invoices/course payments from teacher share too.
  const teacherShareRegular = await db
    .select({
      total: sql`sum(${paymentInvoice.teacherShare})`
    })
    .from(paymentInvoice)
    .innerJoin(invoice, eq(paymentInvoice.invoiceId, invoice.id))
    .where(
      and(
        between(invoice.issueDate, startStr, endStr),
        sql`${invoice.status} != 'cancelled'`
      )
    );

  const teacherShareCourse = await db
    .select({
      total: sql`sum(${coursePayment.amount})`
    })
    .from(coursePayment)
    .where(
      and(
        between(coursePayment.createdAt, startStr, endStr),
        eq(coursePayment.status, 'paid')
      )
    );

  // ─── 8. Expenses ─────────────────────────────────
 const expenseTotal = await db
    .select({
      total: sql`sum(${expense.amount})`
    })
    .from(expense)
    .where(
      and(
        gte(sql`date(${expense.createdAt})`, startStr),
        lte(sql`date(${expense.createdAt})`, endStr)
      )
    );

  const totalExpenses = Number(expenseTotal[0]?.total || 0);
  console.log(`📊 Total expenses for ${startStr} to ${endStr}: ${totalExpenses}`);

  // ─── 9. Recent Activity ──────────────────────────
  // Cancelled invoices are excluded from "recent activity" since they
  // should be treated as if they don't exist.
  const recentInvoices = await db
    .select()
    .from(invoice)
    .where(sql`${invoice.status} != 'cancelled'`)
    .orderBy(desc(invoice.createdAt))
    .limit(10);

  // ─── 10. Top 5 Students by Invoice Amount ────────
  // Cancelled invoices excluded from the sum used for ranking.
  const topStudents = await db
    .select({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      totalAmount: sql`sum(${invoice.amount})`
    })
    .from(invoice)
    .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(
      and(
        between(invoice.issueDate, startStr, endStr),
        sql`${invoice.status} != 'cancelled'`
      )
    )
    .groupBy(student.id)
    .orderBy(desc(sql`sum(${invoice.amount})`))
    .limit(5);

  // ─── 11. Monthly Revenue Trend (last 12 months) ──
  // Cancelled invoices excluded from both total and paid columns.
  const monthlyRevenue = await db
    .select({
      month: sql`strftime('%Y-%m', ${invoice.issueDate})`,
      total: sql`sum(case when ${invoice.status} != 'cancelled' then ${invoice.amount} else 0 end)`,
      paid: sql`sum(case when ${invoice.status} = 'paid' then ${invoice.amount} else 0 end)`
    })
    .from(invoice)
    .where(
      and(
        gte(invoice.issueDate, `${now.getFullYear() - 1}-01-01`),
        lte(invoice.issueDate, `${now.getFullYear()}-12-31`),
        sql`${invoice.status} != 'cancelled'`
      )
    )
    .groupBy(sql`strftime('%Y-%m', ${invoice.issueDate})`)
    .orderBy(asc(sql`strftime('%Y-%m', ${invoice.issueDate})`));

    //  12 employee paid payments !
    const employeePaidTotal = await db
  .select({
    total: sql`sum(${employeePayment.amount})`
  })
  .from(employeePayment)
  .where(
    and(
      eq(employeePayment.status, 'paid'),
      gte(sql`date(${employeePayment.paidAt})`, startStr),
      lte(sql`date(${employeePayment.paidAt})`, endStr)
    )
  );

const totalEmployeePayments = Number(employeePaidTotal[0]?.total || 0);

  // ─── Combine Results ────────────────────────────
  const totalTeacherShare = Number(teacherShareRegular[0]?.total || 0) + Number(teacherShareCourse[0]?.total || 0);
  const totalInvoiceAmount = Number(invoiceStats[0]?.totalAmount || 0); // already excludes cancelled
  const grossRevenue = totalInvoiceAmount - totalTeacherShare;
  const netRevenue = grossRevenue - totalExpenses -totalEmployeePayments;

  return {
    period: {
      from: startStr,
      to: endStr,
      label: period
    },
    students: {
      total: Number(studentStats[0]?.total || 0),
      active: Number(studentStats[0]?.active || 0),
      inactive: Number(studentStats[0]?.inactive || 0)
    },
    modules: {
      total: Number(moduleStats[0]?.total || 0),
      active: Number(moduleStats[0]?.active || 0),
      archived: Number(moduleStats[0]?.archived || 0)
    },
    courses: {
      total: Number(courseStats[0]?.total || 0),
      active: Number(courseStats[0]?.active || 0),
      archived: Number(courseStats[0]?.archived || 0)
    },
    teachers: {
      total: Number(teacherStats[0]?.total || 0),
      active: Number(teacherStats[0]?.active || 0),
      inactive: Number(teacherStats[0]?.inactive || 0)
    },
    invoices: {
      // totalAmount/totalCount exclude cancelled invoices (treated as deleted)
      totalAmount: Number(invoiceStats[0]?.totalAmount || 0),
      paidAmount: Number(invoiceStats[0]?.paidAmount || 0),
      pendingAmount: Number(invoiceStats[0]?.pendingAmount || 0),
      overdueAmount: Number(invoiceStats[0]?.overdueAmount || 0),
      cancelledAmount: Number(invoiceStats[0]?.cancelledAmount || 0), // reported for visibility only
      totalCount: Number(invoiceStats[0]?.totalCount || 0),
      paidCount: Number(invoiceStats[0]?.paidCount || 0),
      pendingCount: Number(invoiceStats[0]?.pendingCount || 0),
      overdueCount: Number(invoiceStats[0]?.overdueCount || 0),
      cancelledCount: Number(invoiceStats[0]?.cancelledCount || 0) // reported for visibility only
    },
    teacherPayments: {
      regular: {
        totalAmount: Number(regularPaymentStats[0]?.totalAmount || 0),
        paidAmount: Number(regularPaymentStats[0]?.paidAmount || 0),
        pendingAmount: Number(regularPaymentStats[0]?.pendingAmount || 0),
        cancelledAmount: Number(regularPaymentStats[0]?.cancelledAmount || 0),
        totalCount: Number(regularPaymentStats[0]?.totalCount || 0),
        paidCount: Number(regularPaymentStats[0]?.paidCount || 0),
        pendingCount: Number(regularPaymentStats[0]?.pendingCount || 0),
        cancelledCount: Number(regularPaymentStats[0]?.cancelledCount || 0)
      },
      course: {
        totalAmount: Number(coursePaymentStats[0]?.totalAmount || 0),
        paidAmount: Number(coursePaymentStats[0]?.paidAmount || 0),
        pendingAmount: Number(coursePaymentStats[0]?.pendingAmount || 0),
        cancelledAmount: Number(coursePaymentStats[0]?.cancelledAmount || 0),
        totalCount: Number(coursePaymentStats[0]?.totalCount || 0),
        paidCount: Number(coursePaymentStats[0]?.paidCount || 0),
        pendingCount: Number(coursePaymentStats[0]?.pendingCount || 0),
        cancelledCount: Number(coursePaymentStats[0]?.cancelledCount || 0)
      },
      combined: {
        totalAmount: Number(regularPaymentStats[0]?.totalAmount || 0) + Number(coursePaymentStats[0]?.totalAmount || 0),
        paidAmount: Number(regularPaymentStats[0]?.paidAmount || 0) + Number(coursePaymentStats[0]?.paidAmount || 0),
        pendingAmount: Number(regularPaymentStats[0]?.pendingAmount || 0) + Number(coursePaymentStats[0]?.pendingAmount || 0),
        cancelledAmount: Number(regularPaymentStats[0]?.cancelledAmount || 0) + Number(coursePaymentStats[0]?.cancelledAmount || 0),
        totalCount: Number(regularPaymentStats[0]?.totalCount || 0) + Number(coursePaymentStats[0]?.totalCount || 0),
        paidCount: Number(regularPaymentStats[0]?.paidCount || 0) + Number(coursePaymentStats[0]?.paidCount || 0),
        pendingCount: Number(regularPaymentStats[0]?.pendingCount || 0) + Number(coursePaymentStats[0]?.pendingCount || 0),
        cancelledCount: Number(regularPaymentStats[0]?.cancelledCount || 0) + Number(coursePaymentStats[0]?.cancelledCount || 0)
      }
    },
    revenue: {
      grossRevenue: grossRevenue,
      totalExpenses: totalExpenses,
      netRevenue: netRevenue,
      netRevenuePercentage: grossRevenue > 0 ? (netRevenue / grossRevenue * 100) : 0,
      teacherShare: totalTeacherShare,
      totalInvoiceAmount: totalInvoiceAmount,
     totalEmployeePayments: totalEmployeePayments,
    },
    recentInvoices: recentInvoices,
    topStudents: topStudents.map(s => ({
      id: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      totalAmount: Number(s.totalAmount || 0)
    })),
    monthlyRevenue: monthlyRevenue.map(m => ({
      month: m.month,
      total: Number(m.total || 0),
      paid: Number(m.paid || 0)
    }))
  };
}

}