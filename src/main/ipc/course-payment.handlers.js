import { ipcMain } from 'electron';
import { CoursePaymentService } from '../services/index.js';

const coursePaymentService = new CoursePaymentService();
console.log('✅ coursePaymentService created:', coursePaymentService);
export function registerCoursePaymentHandlers() {
  // ─── GET TEACHER COURSE PAYMENTS ──────────────────
  ipcMain.handle('course-payment:get-teacher-payments', async (event, { teacherId, options = {} }) => {
    try {
      const result = await coursePaymentService.getTeacherCoursePayments(teacherId, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE PENDING PAYMENT ────────────────────
  ipcMain.handle('course-payment:get-pending', async (event, { courseId, teacherId }) => {
    try {
      const result = await coursePaymentService.getCoursePendingPayment(courseId, teacherId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── MARK COURSE PAYMENT AS PAID ──────────────────
  ipcMain.handle('course-payment:mark-as-paid', async (event, { paymentId, amountToPay, paidAt }) => {
    try {
      const result = await coursePaymentService.markCoursePaymentAsPaid(paymentId, amountToPay, paidAt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL COURSE PAYMENT ─────────────────────────
  ipcMain.handle('course-payment:cancel', async (event, { paymentId, reason }) => {
    try {
      const result = await coursePaymentService.cancelCoursePayment(paymentId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE PAYMENT DETAILS ────────────────────
  ipcMain.handle('course-payment:get-details', async (event, paymentId) => {
    try {
      const result = await coursePaymentService.getCoursePaymentDetails(paymentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET ALL PENDING COURSE PAYMENTS ──────────────
  ipcMain.handle('course-payment:get-all-pending', async () => {
    try {
      const result = await coursePaymentService.getAllPendingCoursePayments();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COMBINED TEACHER PAYMENTS ─────────────────
  ipcMain.handle('course-payment:get-combined', async (event, teacherId) => {
    try {
      const result = await coursePaymentService.getCombinedTeacherPayments(teacherId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL ALL PENDING PAYMENTS FOR COURSE ────────
  ipcMain.handle('course-payment:cancel-all', async (event, { courseId, reason }) => {
    try {
      const result = await coursePaymentService.cancelAllPendingPaymentsForCourse(courseId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('course-payment:get-payments-by-course', async (event, courseId) => {
  try {
    const result = await coursePaymentService.getPaymentsByCourse(courseId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
}