import { ipcMain } from 'electron';
import { CourseEnrollmentService } from '../services/index.js';

const courseEnrollmentService = new CourseEnrollmentService();

export function registerCourseEnrollmentHandlers() {
  // ─── ENROLL STUDENT TO COURSE ──────────────────────
  ipcMain.handle('course-enrollment:enroll-student', async (event, { studentId, courseId, notes }) => {
    try {
      const result = await courseEnrollmentService.enrollStudentToCourse(studentId, courseId, notes);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE STUDENT AND ENROLL TO COURSE ──────────
  ipcMain.handle('course-enrollment:create-and-enroll', async (event, { studentData, courseId, notes }) => {
    try {
      const result = await courseEnrollmentService.createAndEnrollStudentToCourse(studentData, courseId, notes);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── SUSPEND STUDENT FROM COURSE ──────────────────
  ipcMain.handle('course-enrollment:suspend', async (event, { studentId, courseId, reason }) => {
    try {
      const result = await courseEnrollmentService.suspendStudentFromCourse(studentId, courseId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE COURSE INVOICE ─────────────────────────
  ipcMain.handle('course-enrollment:update-invoice', async (event, { invoiceId, newAmount, reason }) => {
    try {
      const result = await courseEnrollmentService.updateCourseInvoice(invoiceId, newAmount, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL COURSE INVOICE ─────────────────────────
  ipcMain.handle('course-enrollment:cancel-invoice', async (event, { invoiceId, reason }) => {
    try {
      const result = await courseEnrollmentService.cancelCourseInvoice(invoiceId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── MARK COURSE INVOICE AS PAID ──────────────────
  ipcMain.handle('course-enrollment:mark-invoice-paid', async (event, { invoiceId, paidAt }) => {
    try {
      const result = await courseEnrollmentService.markCourseInvoiceAsPaid(invoiceId, paidAt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE INVOICE DETAILS ────────────────────
  ipcMain.handle('course-enrollment:get-invoice-details', async (event, invoiceId) => {
    try {
      const result = await courseEnrollmentService.getCourseInvoiceDetails(invoiceId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENT COURSE INVOICES ──────────────────
  ipcMain.handle('course-enrollment:get-student-invoices', async (event, { studentId, courseId }) => {
    try {
      const result = await courseEnrollmentService.getStudentCourseInvoices(studentId, courseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE INVOICES ──────────────────────────
  ipcMain.handle('course-enrollment:get-course-invoices', async (event, courseId) => {
    try {
      const result = await courseEnrollmentService.getCourseInvoices(courseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('course-enrollment:get-course-enrollments', async (event, courseId) => {
  try {
    const result = await courseEnrollmentService.getCourseEnrollments(courseId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

}