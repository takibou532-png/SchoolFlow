import { BaseService } from './base.service.js';
import { StudentRepository, ModuleRepository, EnrollmentRepository ,} from '../repositories/index.js';
import { getDb } from '../db/client.js';
import { InvoiceService } from './invoice.service.js';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs';
import {
  student,
  enrollment,
  invoice,
  module_,
  course,
  courseEnrollment,
  studentAttendance,
  session,
} from '../db/index.js';
import { sql, eq, and, inArray, not, or, isNull } from 'drizzle-orm';

export class StudentService extends BaseService {
  constructor() {
    super(new StudentRepository());
     this.invoiceService = new InvoiceService();
    this.moduleRepo = new ModuleRepository();
    this.enrollmentRepo = new EnrollmentRepository();
  }


  // ─── PRIVATE: Save avatar file ─────────────────────
async _saveAvatarFile(file) {
  const userDataDir = app.getPath('userData');
  const avatarsDir = join(userDataDir, 'avatars');
  if (!existsSync(avatarsDir)) {
    mkdirSync(avatarsDir, { recursive: true });
  }
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `avatar_${Date.now()}.${ext}`;
  const destPath = join(avatarsDir, fileName);
  copyFileSync(file.path, destPath);
  return destPath;
}

// ─── PRIVATE: Get avatar as base64 ──────────────────
async _getAvatarData(studentId) {
  const student = await this.repository.findById(studentId);
  if (!student || !student.avatarPath) return null;
  try {
    const data = readFileSync(student.avatarPath);
    const ext = student.avatarPath.split('.').pop().toLowerCase();
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    return `data:${mimeType};base64,${data.toString('base64')}`;
  } catch (e) {
    console.error('Failed to read avatar:', e);
    return null;
  }
}

// ─── Public: Get avatar for a student ───────────────
async getAvatar(studentId) {
  return this._getAvatarData(studentId);
}

  // ─── CREATE STUDENT (without enrollment) ──────────
async createStudent(data) {
  if (!data.firstName || !data.lastName) {
    throw new Error('First name and last name are required');
  }
  let avatarPath = null;
  if (data.avatarFile && data.avatarFile.path) {
    avatarPath = await this._saveAvatarFile(data.avatarFile);
    delete data.avatarFile;
  }
  const studentData = {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    dateOfBirth: data.dateOfBirth || null,
    guardianName: data.guardianName || null,
    guardianPhone: data.guardianPhone || null,
    address: data.address || null,
    isActive: true,
    avatarPath,
    createdAt: new Date().toISOString(),
  };
  return this.repository.create(studentData);
}
// ─── GET STUDENT ENROLLMENTS ──────────────────────
async getStudentEnrollments(studentId) {
  const db = getDb();

  // Helper: format date to YYYY-MM-DD
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  };

  // Get module enrollments
  const moduleEnrollments = await db
    .select({
      id: enrollment.id,
      moduleName: module_.name,
      moduleId: module_.id,
      level: module_.level,
      enrolledAt: enrollment.enrolledAt,
    })
    .from(enrollment)
    .innerJoin(module_, eq(enrollment.moduleId, module_.id))
    .where(
      and(
        eq(enrollment.studentId, studentId),
        eq(enrollment.isActive, true)
      )
    );

  // Get course enrollments
  const courseEnrollments = await db
    .select({
      id: courseEnrollment.id,
      courseName: course.name,
      courseId: course.id,
      enrolledAt: courseEnrollment.enrolledAt,
    })
    .from(courseEnrollment)
    .innerJoin(course, eq(courseEnrollment.courseId, course.id))
    .where(
      and(
        eq(courseEnrollment.studentId, studentId),
        eq(courseEnrollment.isActive, true)
      )
    );

  // Format dates
  const formattedModules = moduleEnrollments.map(m => ({
    ...m,
    enrolledAt: formatDate(m.enrolledAt),
  }));

  const formattedCourses = courseEnrollments.map(c => ({
    ...c,
    enrolledAt: formatDate(c.enrolledAt),
  }));

  return {
    modules: formattedModules,
    courses: formattedCourses,
  };
}

  // Create student and enroll in module
// src/main/services/student.service.js

// ─── CREATE STUDENT AND ENROLL TO MODULE ────────────
/**
 * Create a new student and enroll them in a module
 * @param {Object} studentData - { firstName, lastName, dateOfBirth?, guardianName?, guardianPhone?, address? }
 * @param {number} moduleId

 */
async createStudentWithEnrollment(studentData, moduleId) {
  const db = getDb();

  // 1. Validate required fields
  if (!studentData.firstName || !studentData.lastName) {
    throw new Error('First name and last name are required');
  }
  if (!moduleId) {
    throw new Error('Module ID is required for enrollment');
  }

  // 2. Validate module exists and is active
  const module = await this.moduleRepo.findById(moduleId);
  if (!module) throw new Error('Module not found');
  if (!module.isActive) throw new Error('Cannot enroll into an inactive module');

  // 3. Perform transaction
  const result = await db.transaction(() => {
    // Create student
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
    const newStudent = this.repository.create(studentDataWithDefaults);

    // Create enrollment
    const enrollmentData = {
      studentId: newStudent.id,
      moduleId: moduleId,
      isActive: true,
      enrolledAt: new Date().toISOString(),
     
    };
    const newEnrollment = this.enrollmentRepo.create(enrollmentData);

    return { student: newStudent, enrollment: newEnrollment };
  });

  // 4. Generate invoice for this enrollment (outside transaction)
  try {
    await this.invoiceService.generateInvoiceForNewEnrollment(result.enrollment.id);
  } catch (error) {
    console.error(`Failed to generate invoice for enrollment ${result.enrollment.id}:`, error);
  }

  return result;
}



// ─── GET STUDENT STATS ──────────────────────────────
async getStudentStats(studentId) {
  const db = getDb();
  const { invoice, enrollment, studentAttendance } = await import('../db/index.js');

  // 1. Invoice stats (paid count, etc.)
  const invoiceStats = await db
    .select({
      totalCount: sql`count(*)`,
      paidCount: sql`sum(case when ${invoice.status} = 'paid' then 1 else 0 end)`,
      pendingCount: sql`sum(case when ${invoice.status} = 'pending' then 1 else 0 end)`,
      overdueCount: sql`sum(case when ${invoice.status} = 'overdue' then 1 else 0 end)`,
      totalAmount: sql`sum(${invoice.amount})`,
      paidAmount: sql`sum(case when ${invoice.status} = 'paid' then ${invoice.amount} else 0 end)`,
    })
    .from(invoice)
    .innerJoin(enrollment, eq(invoice.enrollmentId, enrollment.id))
    .where(eq(enrollment.studentId, studentId));

  // 2. Attendance rate (from student_attendance)
  const attendanceStats = await db
    .select({
      total: sql`count(*)`,
      present: sql`sum(case when ${studentAttendance.status} = 'present' then 1 else 0 end)`,
    })
    .from(studentAttendance)
    .where(eq(studentAttendance.studentId, studentId));

  const totalAtt = Number(attendanceStats[0]?.total || 0);
  const presentAtt = Number(attendanceStats[0]?.present || 0);

  return {
    invoiceStats: {
      totalCount: Number(invoiceStats[0]?.totalCount || 0),
      paidCount: Number(invoiceStats[0]?.paidCount || 0),
      pendingCount: Number(invoiceStats[0]?.pendingCount || 0),
      overdueCount: Number(invoiceStats[0]?.overdueCount || 0),
      totalAmount: Number(invoiceStats[0]?.totalAmount || 0),
      paidAmount: Number(invoiceStats[0]?.paidAmount || 0),
    },
    attendanceRate: totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(2)) : 0,
  };
}

// ─── GET STUDENT ATTENDANCE ──────────────────────────
async getStudentAttendance(studentId) {
  const db = getDb();
  const { studentAttendance, session, module_ } = await import('../db/index.js');

  const records = await db
    .select({
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: studentAttendance.status,
      moduleName: module_.name,
    })
    .from(studentAttendance)
    .innerJoin(session, eq(studentAttendance.sessionId, session.id))
    .innerJoin(module_, eq(session.moduleId, module_.id))
    .where(eq(studentAttendance.studentId, studentId))
    .orderBy(session.date, 'desc')
    .limit(20); // limit to recent

  return records.map(r => ({
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    moduleName: r.moduleName,
  }));
}




// ─── ENROLL EXISTING STUDENT TO MODULE ──────────────
async enrollStudentToModule(studentId, moduleId, notes = null) {
  const db = getDb();

  // 1. Validate student exists and is active
  const student = await this.repository.findById(studentId);
  if (!student) throw new Error('Student not found');
  if (!student.isActive) throw new Error('Student is not active');

  // 2. Validate module exists and is active
  const module = await this.moduleRepo.findById(moduleId);
  if (!module) throw new Error('Module not found');
  if (!module.isActive) throw new Error('Cannot enroll into an inactive module');

  // 3. Check if student is already enrolled in this module
  const existingEnrollment = await this.enrollmentRepo.findByStudentAndModule(studentId, moduleId);
  if (existingEnrollment) {
    if (existingEnrollment.isActive) {
      throw new Error('Student is already enrolled in this module');
    } else {
      throw new Error('Student was previously enrolled but suspended. Please reactivate or create new enrollment.');
    }
  }

  // 4. Create enrollment
  // NOTE: this is a single insert, so a manual transaction isn't necessary here.
  // If you need transactional safety later (e.g. once more writes join this step),
  // use Drizzle's own `db.transaction(async (tx) => {...})` API instead of raw
  // BEGIN/COMMIT strings — the underlying `db` object from getDb() is a Drizzle
  // instance, not a raw driver, so it has no .exec() method.
  let newEnrollment;
  try {
    const enrollmentData = {
      studentId: studentId,
      moduleId: moduleId,
      isActive: true,
      enrolledAt: new Date().toISOString(),
      notes: notes || null,
    };
    newEnrollment = await this.enrollmentRepo.create(enrollmentData);
  } catch (error) {
    throw error;
  }

  // 5. Generate invoice for this enrollment
  // Pass the full object (not just the id) — we already have it in hand,
  // and re-fetching by id immediately after insert risks a read-your-write
  // visibility gap depending on the driver/connection setup.
  try {
    await this.invoiceService.generateInvoiceForNewEnrollment(newEnrollment);
  } catch (error) {
    console.error(`Failed to generate invoice for enrollment ${newEnrollment.id}:`, error);
    throw new Error(`Invoice generation failed: ${error.message}`);
  }

  return {
    student: student,
    module: module,
    enrollment: newEnrollment,
  };
}

   // --- 1. Get students by module ---
  async getStudentsByModule(moduleId, options = {}) {
    const { activeOnly = true, includeInvoices = false } = options;
    const db = getDb();

    let query = db
      .select({
        student: student,
        enrollment: enrollment,
        // optionally include module info
        module: module_
      })
      .from(enrollment)
      .where(eq(enrollment.moduleId, moduleId))
      .leftJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(module_, eq(enrollment.moduleId, module_.id));

    if (activeOnly) {
      query = query.where(eq(enrollment.isActive, true));
    }

    const results = await query;

    // If we need invoice info, we could do additional query per student or join
    // For simplicity, we'll return the list with enrollment data
    return results;
  }

  // --- 2. Get all students with pagination/search ---
  async getAllStudents(options = {}) {
    // Pass through to repository's findAll which already supports pagination, search, filters
    return this.repository.findAll(options);
  }

  // --- 3. Get students with unpaid invoices ---
  async getStudentsWithUnpaidInvoices() {
    const db = getDb();

    // We need students who have at least one invoice with status != 'paid' and != 'cancelled'
    // and enrollment is active (optional)
    const unpaidStudents = await db
      .selectDistinct({
        student: student,
        // maybe also aggregate invoice info?
      })
      .from(student)
      .innerJoin(enrollment, eq(enrollment.studentId, student.id))
      .innerJoin(invoice, eq(invoice.enrollmentId, enrollment.id))
      .where(
        and(
          eq(enrollment.isActive, true),
          or(
            eq(invoice.status, 'pending'),
            eq(invoice.status, 'overdue')
          )
        )
      );

    // Optionally, we could also include invoice details grouped
    return unpaidStudents.map(row => row.student);
  }

  // --- 4. Suspend a student from a module (deactivate enrollment) ---
async suspendStudentFromModule(studentId, moduleId, reason = null) {
  const db = getDb();

  // 1. Check if enrollment exists and is active
  const enrollment = await this.enrollmentRepo.findByStudentAndModule(studentId, moduleId);
  if (!enrollment) {
    throw new Error('No active enrollment found for this student in this module');
  }

  // 2. Get student and module for context
  const student = await this.repository.findById(studentId);
  if (!student) throw new Error('Student not found');
  const module = await this.moduleRepo.findById(moduleId);
  if (!module) throw new Error('Module not found');

  // 3. In transaction: deactivate enrollment (sync — no await inside or on the transaction itself)
  const result = db.transaction(() => {
    const updatedEnrollment = this.enrollmentRepo.update(enrollment.id, {
      isActive: false
    });

    return updatedEnrollment;
  });

  // 4. After transaction: cancel all pending invoices for this enrollment
  try {
    await this.invoiceService.cancelInvoicesForEnrollment(
      enrollment.id,
      reason || `Student ${student.firstName} ${student.lastName} suspended from ${module.name}`
    );
  } catch (error) {
    console.error(`Failed to cancel invoices for enrollment ${enrollment.id}:`, error);
    // Don't fail the suspension if invoice cancellation fails
  }

  return result;
}

  // --- 5. Update student details ---
 async updateStudent(studentId, data) {
  const existing = await this.repository.findById(studentId);
  if (!existing) throw new Error('Student not found');
  const updateData = {};
  if (data.avatarFile && data.avatarFile.path) {
    const newPath = await this._saveAvatarFile(data.avatarFile);
    updateData.avatarPath = newPath;
    delete data.avatarFile;
  }
  // Handle other fields
  const allowed = ['firstName', 'lastName', 'dateOfBirth', 'guardianName', 'guardianPhone', 'address', 'isActive'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }
  return this.repository.update(studentId, updateData);
}

 

}