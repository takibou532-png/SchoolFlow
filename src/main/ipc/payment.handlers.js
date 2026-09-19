import { ipcMain } from 'electron';
import { PaymentService } from '../services/index.js';

const paymentService = new PaymentService();

export function registerPaymentHandlers() {
  // ─── GET TEACHER PAYMENT HISTORY ──────────────────
  ipcMain.handle('payment:get-teacher-history', async (event, { teacherId, options = {} }) => {
    try {
      const result = await paymentService.getTeacherPaymentHistory(teacherId, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET TEACHER PENDING PAYMENTS ──────────────────
  ipcMain.handle('payment:get-teacher-pending', async (event, teacherId) => {
    try {
      const result = await paymentService.getTeacherPendingPayments(teacherId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── MARK PAYMENT AS PAID ──────────────────────────
  ipcMain.handle('payment:mark-as-paid', async (event, { paymentId, amountToPay, paidAt }) => {
    try {
      const result = await paymentService.markPaymentAsPaid(paymentId, amountToPay, paidAt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL PAYMENT ────────────────────────────────
  ipcMain.handle('payment:cancel', async (event, paymentId) => {
    try {
      const result = await paymentService.cancelPayment(paymentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET PAYMENT DETAILS ───────────────────────────
  ipcMain.handle('payment:get-details', async (event, paymentId) => {
    try {
      const result = await paymentService.getPaymentDetails(paymentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}