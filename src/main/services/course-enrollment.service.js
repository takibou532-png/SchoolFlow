// src/main/services/course-enrollment.service.js

import { BaseService } from './base.service.js';
import { 
  CourseEnrollmentRepository, 
  CourseRepository, 
  CourseSessionRepository,
  StudentRepository,
  InvoiceRepository,
  CoursePaymentRepository,
  TeacherRepository
} from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { 
  courseEnrollment, 
  courseSession, 
  invoice, 
  coursePayment, 
  course as courseTable,
  student 
} from '../db/index.js';
import { eq, and, gte, sql, inArray, asc, desc } from 'drizzle-orm';
import { CoursePaymentService } from './course-payment.service.js';

export class CourseEnrollmentService extends BaseService {
  constructor() {
    super(new CourseEnrollmentRepository());
    this.courseRepo = new CourseRepository();
    this.sessionRepo = new CourseSessionRepository();
    this.studentRepo = new StudentRepository();
    this.invoiceRepo = new InvoiceRepository();
    this.coursePaymentRepo = new CoursePaymentRepository();
    this.teacherRepo = new TeacherRepository();
    this.coursePaymentService = new CoursePaymentService();
  }

  // ─── ENROLL EXISTING STUDENT TO COURSE ──────────
async enrollStudentToCourse(studentId, courseId, notes = null) {
  const db = getDb();

  const studentRecord = await this.studentRepo.findById(studentId);
  if (!studentRecord) throw new Error('Student not found');
  if (!studentRecord.isActive) throw new Error('Student is not active');

  const course = await this.courseRepo.findById(courseId);
  if (!course) throw new Error('Course not found');
  if (!course.isActive) throw new Error('Course is not active');

  const existing = await this.repository.findByStudentAndCourse(studentId, courseId);
  if (existing) {
    if (existing.isActive) {
      throw new Error('Student is already enrolled in this course');
    } else {
      throw new Error('Student was previously enrolled but suspended. Please reactivate or create new enrollment.');
    }
  }

  if (course.maxStudents) {
    const currentCount = await this.repository.countActiveByCourse(courseId);
    if (currentCount >= course.maxStudents) {
      throw new Error(`Course is full (max ${course.maxStudents} students)`);
    }
  }

  let teacherRecord = null;
  if (course.teacherId) {
    teacherRecord = await this.teacherRepo.findById(course.teacherId);
    if (!teacherRecord) throw new Error('Teacher assigned to this course was not found');
  }

  const price = await this._calculateProratedPrice(courseId);

  // Session count for the course (used as sessionCount default on the invoice)
  const sessions = await db
    .select()
    .from(courseSession)
    .where(eq(courseSession.courseId, courseId))
    .all();

  return db.transaction(() => {
    const enrollmentData = {
      courseId,
      studentId,
      enrolledAt: new Date().toISOString(),
      isActive: true,
      price,
      notes: notes || null
    };
    const newEnrollment = this.repository.create(enrollmentData); // sync repo, see earlier fix

    const invoiceData = {
      // enrollmentId intentionally omitted — now nullable, this flow doesn't use it
      courseEnrollmentId: newEnrollment.id,
      amount: price,
      issueDate: new Date().toISOString(),
      dueDate: this._calculateDueDate(),
      status: 'pending',
      notes: `Course: ${course.name} - Student: ${studentRecord.firstName} ${studentRecord.lastName}`,

      // Required columns from the module/scheduling flow — safe course-flow defaults
      cycleNumber: 1,
      cycleStartDate: course.startDate,
      cycleEndDate: course.endDate,
      isProrated: price < course.totalPrice,
      originalMonthlyPrice: course.totalPrice,
      creditApplied: 0,
      sessionCount: sessions.length
    };
    const newInvoice = this.invoiceRepo.create(invoiceData); // sync repo

    if (course.teacherId && teacherRecord) {
      this._handleCourseTeacherPayment(course, teacherRecord, price, newInvoice.id);
    }

    return { enrollment: newEnrollment, invoice: newInvoice };
  });
}

  // ─── CREATE STUDENT AND ENROLL TO COURSE ──────────
  async createAndEnrollStudentToCourse(studentData, courseId, notes = null) {
    const db = getDb();

    if (!studentData.firstName || !studentData.lastName) {
      throw new Error('First name and last name are required');
    }

    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (!course.isActive) throw new Error('Course is not active');

    if (course.maxStudents) {
      const currentCount = await this.repository.countActiveByCourse(courseId);
      if (currentCount >= course.maxStudents) {
        throw new Error(`Course is full (max ${course.maxStudents} students)`);
      }
    }

    const price = await this._calculateProratedPrice(courseId);

    return db.transaction(() => {
      const studentDataWithDefaults = {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        dateOfBirth: studentData.dateOfBirth || null,
        guardianName: studentData.guardianName || null,
        guardianPhone: studentData.guardianPhone || null,
        address: studentData.address || null,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      const newStudent = this.studentRepo.create(studentDataWithDefaults);

      const enrollmentData = {
        courseId,
        studentId: newStudent.id,
        enrolledAt: new Date().toISOString(),
        isActive: true,
        price,
        notes: notes || null
      };
      const newEnrollment = this.repository.create(enrollmentData);

      const invoiceData = {
        courseEnrollmentId: newEnrollment.id,
        amount: price,
        issueDate: new Date().toISOString(),
        dueDate: this._calculateDueDate(),
        status: 'pending',
        notes: `Course: ${course.name} - Student: ${newStudent.firstName} ${newStudent.lastName}`
      };
      const newInvoice = this.invoiceRepo.create(invoiceData);

      if (course.teacherId) {
        this._handleCourseTeacherPayment(course, price, newInvoice.id);
      }

      return {
        student: newStudent,
        enrollment: newEnrollment,
        invoice: newInvoice
      };
    });
  }

  // ─── GET COURSE ENROLLMENTS ────────────────────────
async getCourseEnrollments(courseId) {
  const db = getDb();
  
  const results = await db
    .select({
      id: courseEnrollment.id,
      studentId: courseEnrollment.studentId,
      enrolledAt: courseEnrollment.enrolledAt,
      isActive: courseEnrollment.isActive,
      price: courseEnrollment.price,
      firstName: student.firstName,
      lastName: student.lastName,
    })
    .from(courseEnrollment)
    .innerJoin(student, eq(courseEnrollment.studentId, student.id))
    .where(eq(courseEnrollment.courseId, courseId))
    .orderBy(desc(courseEnrollment.enrolledAt));

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  };

  return results.map(r => ({
    ...r,
    enrolledAt: formatDate(r.enrolledAt),
  }));
}

  // ─── SUSPEND STUDENT FROM COURSE ──────────────────
  async suspendStudentFromCourse(studentId, courseId, reason = null) {
    const db = getDb();

    const enrollment = await this.repository.findByStudentAndCourse(studentId, courseId);
    if (!enrollment) {
      throw new Error('No active enrollment found for this student in this course');
    }

    const studentRecord = await this.studentRepo.findById(studentId);
    if (!studentRecord) throw new Error('Student not found');
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new Error('Course not found');

    const pendingInvoices = await this.invoiceRepo.findPendingByCourseEnrollment(enrollment.id);

    return db.transaction(() => {
      const updatedEnrollment = this.repository.update(enrollment.id, {
        isActive: false,
        notes: reason ? `Suspended: ${reason}` : 'Suspended'
      });

      const cancelledInvoices = [];
      for (const inv of pendingInvoices) {
        const cancelled = this.invoiceRepo.update(inv.id, {
          status: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled due to suspension'
        });
        cancelledInvoices.push(cancelled);

        this._removeCourseTeacherPayment(courseId, inv.id);
      }

      return {
        enrollment: updatedEnrollment,
        cancelledInvoices
      };
    });
  }

  // ─── PRIVATE: Calculate Prorated Price ────────────
  async _calculateProratedPrice(courseId) {
    const db = getDb();

    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new Error('Course not found');

    const sessions = await db
      .select()
      .from(courseSession)
      .where(eq(courseSession.courseId, courseId))
      .orderBy(asc(courseSession.date), asc(courseSession.startTime));

    if (sessions.length === 0) {
      throw new Error('No sessions found for this course');
    }

    const today = new Date().toISOString().split('T')[0];
    const nextSession = sessions.find(s => s.date >= today);

    if (!nextSession) {
      throw new Error('Course has already ended');
    }

    const nextIndex = nextSession.sessionIndex;
    const missedSessions = nextIndex - 1;

    if (missedSessions === 0) {
      return course.totalPrice;
    }

    const prorated = course.totalPrice - (missedSessions * course.sessionPrice);
    return Math.max(0, prorated);
  }

  // ─── PRIVATE: Calculate Due Date ──────────────────
  _calculateDueDate() {
    const now = new Date();
    now.setDate(now.getDate() + 15);
    return now.toISOString().split('T')[0];
  }

  // ─── PRIVATE: Handle Course Teacher Payment ──────
 _handleCourseTeacherPayment(course, teacher, invoiceAmount, invoiceId) {
  const db = getDb();

  if (!course.teacherId || !teacher) return;

  const percentage = Number(teacher.paymentPercentage);
  if (!Number.isFinite(percentage) || percentage <= 0) return;

  const teacherShare = (invoiceAmount * percentage) / 100;
  if (!Number.isFinite(teacherShare) || teacherShare <= 0) return;

  const existingRows = db
    .select()
    .from(coursePayment)
    .where(
      and(
        eq(coursePayment.courseId, course.id),
        eq(coursePayment.teacherId, course.teacherId),
        eq(coursePayment.status, 'pending')
      )
    )
    .limit(1)
    .all();

  let payment = existingRows[0] || null;

  if (!payment) {
    db.insert(coursePayment)
      .values({
        courseId: course.id,
        teacherId: course.teacherId,
        amount: teacherShare,
        status: 'pending',
        paidAt: null,
        notes: `Course: ${course.name}`
      })
      .run();
    return;
  }

  const newAmount = (payment.amount ?? 0) + teacherShare;
  if (!Number.isFinite(newAmount)) {
    throw new Error('Invalid teacher payment amount computed');
  }

  db.update(coursePayment)
    .set({ amount: newAmount })
    .where(eq(coursePayment.id, payment.id))
    .run();
}
  // ─── PRIVATE: Remove Course Teacher Payment ──────
  _removeCourseTeacherPayment(courseId, invoiceId) {
    const db = getDb();

    const invoiceRows = db
      .select()
      .from(invoice)
      .where(eq(invoice.id, invoiceId))
      .limit(1)
      .all();

    const invoiceRow = invoiceRows[0];
    if (!invoiceRow || invoiceRow.status !== 'cancelled') return;

    const courseRows = db
      .select()
      .from(courseTable)
      .where(eq(courseTable.id, courseId))
      .limit(1)
      .all();

    const courseRow = courseRows[0];
    if (!courseRow || !courseRow.teacherId) return;

    const teacherShare = (invoiceRow.amount * courseRow.teacherPercentage) / 100;
    if (teacherShare <= 0) return;

    const paymentRows = db
      .select()
      .from(coursePayment)
      .where(
        and(
          eq(coursePayment.courseId, courseId),
          eq(coursePayment.teacherId, courseRow.teacherId),
          eq(coursePayment.status, 'pending')
        )
      )
      .limit(1)
      .all();

    const payment = paymentRows[0];
    if (!payment) return;

    const newAmount = Math.max(0, payment.amount - teacherShare);
    db
      .update(coursePayment)
      .set({ amount: newAmount })
      .where(eq(coursePayment.id, payment.id))
      .run();
  }

  // ─── GET PAYMENTS BY COURSE ─────────────────────────
  async getPaymentsByCourse(courseId) {
    const db = getDb();
    return db
      .select()
      .from(coursePayment)
      .where(eq(coursePayment.courseId, courseId))
      .orderBy(desc(coursePayment.createdAt));
  }

  // ─── UPDATE COURSE INVOICE ──────────────────────────
  async updateCourseInvoice(invoiceId, newAmount, reason = null) {
    const db = getDb();

    const invoiceRecord = await this.invoiceRepo.findById(invoiceId);
    if (!invoiceRecord) throw new Error('Invoice not found');
    if (!invoiceRecord.courseEnrollmentId) {
      throw new Error('Invoice is not a course invoice');
    }
    if (invoiceRecord.status === 'paid') {
      throw new Error('Cannot update a paid invoice');
    }
    if (invoiceRecord.status === 'cancelled') {
      throw new Error('Cannot update a cancelled invoice');
    }
    if (typeof newAmount !== 'number' || newAmount < 0) {
      throw new Error('Amount must be a positive number');
    }
    if (newAmount === invoiceRecord.amount) return invoiceRecord;

    const enrollment = await this.repository.findById(invoiceRecord.courseEnrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    const course = await this.courseRepo.findById(enrollment.courseId);
    if (!course) throw new Error('Course not found');

    let teacherPercentage = 0;
    let teacherId = null;
    if (course.teacherId) {
      const teacherRecord = await this.teacherRepo.findById(course.teacherId);
      if (teacherRecord) {
        teacherPercentage = teacherRecord.paymentPercentage || 0;
        teacherId = teacherRecord.id;
      }
    }

    const oldShare = (invoiceRecord.amount * teacherPercentage) / 100;
    const newShare = (newAmount * teacherPercentage) / 100;
    const delta = newShare - oldShare;

    return db.transaction(() => {
      const updatedInvoice = this.invoiceRepo.update(invoiceId, {
        amount: newAmount,
        notes: reason ? `${invoiceRecord.notes || ''}\nUpdated: ${reason}` : invoiceRecord.notes
      });

      if (teacherId && delta !== 0) {
        this._adjustCoursePayment(course.id, teacherId, delta);
      }

      return updatedInvoice;
    });
  }

  // ─── CANCEL COURSE INVOICE ──────────────────────────
  async cancelCourseInvoice(invoiceId, reason = null) {
    const db = getDb();

    const invoiceRecord = await this.invoiceRepo.findById(invoiceId);
    if (!invoiceRecord) throw new Error('Invoice not found');
    if (!invoiceRecord.courseEnrollmentId) {
      throw new Error('Invoice is not a course invoice');
    }
    if (invoiceRecord.status === 'paid') {
      throw new Error('Cannot cancel a paid invoice');
    }
    if (invoiceRecord.status === 'cancelled') {
      throw new Error('Invoice is already cancelled');
    }

    const enrollment = await this.repository.findById(invoiceRecord.courseEnrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    const course = await this.courseRepo.findById(enrollment.courseId);
    if (!course) throw new Error('Course not found');

    let teacherId = null;
    let teacherPercentage = 0;
    if (course.teacherId) {
      const teacherRecord = await this.teacherRepo.findById(course.teacherId);
      if (teacherRecord) {
        teacherPercentage = teacherRecord.paymentPercentage || 0;
        teacherId = teacherRecord.id;
      }
    }

    return db.transaction(() => {
      const updatedInvoice = this.invoiceRepo.update(invoiceId, {
        status: 'cancelled',
        notes: reason ? `${invoiceRecord.notes || ''}\nCancelled: ${reason}` : invoiceRecord.notes
      });

      if (teacherId) {
        const share = (invoiceRecord.amount * teacherPercentage) / 100;
        if (share > 0) {
          this._adjustCoursePayment(course.id, teacherId, -share);
        }
      }

      return updatedInvoice;
    });
  }

  // ─── MARK COURSE INVOICE AS PAID ────────────────────
  async markCourseInvoiceAsPaid(invoiceId, paidAt = null) {
    const invoiceRecord = await this.invoiceRepo.findById(invoiceId);
    if (!invoiceRecord) throw new Error('Invoice not found');
    if (!invoiceRecord.courseEnrollmentId) {
      throw new Error('Invoice is not a course invoice');
    }
    if (invoiceRecord.status === 'paid') {
      throw new Error('Invoice is already paid');
    }
    if (invoiceRecord.status === 'cancelled') {
      throw new Error('Cannot mark a cancelled invoice as paid');
    }

    const paidDate = paidAt || new Date().toISOString();
    return await this.invoiceRepo.update(invoiceId, {
      status: 'paid',
      paidAt: paidDate
    });
  }

  // ─── GET COURSE INVOICE DETAILS ─────────────────────
  async getCourseInvoiceDetails(invoiceId) {
    const invoiceRecord = await this.invoiceRepo.findById(invoiceId);
    if (!invoiceRecord) throw new Error('Invoice not found');
    if (!invoiceRecord.courseEnrollmentId) {
      throw new Error('Invoice is not a course invoice');
    }

    const enrollment = await this.repository.findById(invoiceRecord.courseEnrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');

    const studentRecord = await this.studentRepo.findById(enrollment.studentId);
    const course = await this.courseRepo.findById(enrollment.courseId);
    const teacherRecord = course && course.teacherId 
      ? await this.teacherRepo.findById(course.teacherId) 
      : null;

    const sessions = await this.sessionRepo.findByCourse(course.id);

    const attendanceRepo = new (await import('../repositories/course-attendance.repository.js')).CourseAttendanceRepository();
    const attendanceData = await attendanceRepo.findByStudentAndCourse(studentRecord.id, course.id);
    const totalSessions = sessions.length;
    const attended = attendanceData.filter(a => a.attendance && a.attendance.status === 'present').length;

    return {
      invoice: invoiceRecord,
      enrollment,
      student: studentRecord,
      course,
      teacher: teacherRecord,
      sessions,
      attendanceSummary: {
        totalSessions,
        attended,
        attendanceRate: totalSessions > 0 ? (attended / totalSessions) * 100 : 0
      }
    };
  }

  // ─── GET STUDENT COURSE INVOICES ──────────────────
  async getStudentCourseInvoices(studentId, courseId = null) {
    const db = getDb();

    let enrollments = await db
      .select()
      .from(courseEnrollment)
      .where(eq(courseEnrollment.studentId, studentId));

    if (courseId) {
      enrollments = enrollments.filter(e => e.courseId === courseId);
    }

    if (enrollments.length === 0) return [];

    const enrollmentIds = enrollments.map(e => e.id);

    const invoices = await db
      .select()
      .from(invoice)
      .where(inArray(invoice.courseEnrollmentId, enrollmentIds))
      .orderBy(desc(invoice.createdAt));

    const result = [];
    for (const inv of invoices) {
      const enrollment = enrollments.find(e => e.id === inv.courseEnrollmentId);
      if (!enrollment) continue;
      const course = await this.courseRepo.findById(enrollment.courseId);
      const studentRecord = await this.studentRepo.findById(studentId);
      result.push({
        invoice: inv,
        enrollment,
        course,
        student: studentRecord
      });
    }
    return result;
  }

  // ─── GET COURSE INVOICES ───────────────────────────
  async getCourseInvoices(courseId) {
    const db = getDb();

    const enrollments = await this.repository.findActiveByCourse(courseId);
    if (enrollments.length === 0) return [];

    const enrollmentIds = enrollments.map(e => e.id);

    const invoices = await db
      .select()
      .from(invoice)
      .where(inArray(invoice.courseEnrollmentId, enrollmentIds))
      .orderBy(desc(invoice.createdAt));

    const result = [];
    for (const inv of invoices) {
      const enrollment = enrollments.find(e => e.id === inv.courseEnrollmentId);
      if (!enrollment) continue;
      const studentRecord = await this.studentRepo.findById(enrollment.studentId);
      const course = await this.courseRepo.findById(courseId);
      result.push({
        invoice: inv,
        enrollment,
        student: studentRecord,
        course
      });
    }
    return result;
  }

  // ─── PRIVATE: Adjust Course Payment ────────────────
  _adjustCoursePayment(courseId, teacherId, delta) {
    const db = getDb();

    if (delta === 0) return;

    const rows = db
      .select()
      .from(coursePayment)
      .where(
        and(
          eq(coursePayment.courseId, courseId),
          eq(coursePayment.teacherId, teacherId),
          eq(coursePayment.status, 'pending')
        )
      )
      .limit(1)
      .all();

    let payment = rows[0] || null;

    if (!payment) {
      if (delta < 0) return;
      const inserted = db
        .insert(coursePayment)
        .values({
          courseId,
          teacherId,
          amount: 0,
          status: 'pending',
          paidAt: null,
          notes: `Course: ${courseId}`
        })
        .returning()
        .all();
      payment = inserted[0];
    }

    const newAmount = Math.max(0, payment.amount + delta);
    db
      .update(coursePayment)
      .set({ amount: newAmount })
      .where(eq(coursePayment.id, payment.id))
      .run();
  }
}