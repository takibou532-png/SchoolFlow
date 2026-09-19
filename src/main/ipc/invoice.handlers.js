import { ipcMain } from 'electron';
import { InvoiceService } from '../services/index.js';

const invoiceService = new InvoiceService();

export function registerInvoiceHandlers() {
  // ─── GENERATE INVOICES ─────────────────────────────
  ipcMain.handle('invoice:generate', async (event, manual = true) => {
    try {
      const result = await invoiceService.generateInvoices(manual);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('invoice:get-all', async (event, options = {}) => {
  try {
    const result = await invoiceService.getAllInvoices(options);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  // ─── UPDATE INVOICE ────────────────────────────────
  ipcMain.handle('invoice:update', async (event, { invoiceId, newAmount, reason }) => {
    try {
      const result = await invoiceService.updateInvoice(invoiceId, newAmount, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL INVOICE ────────────────────────────────
  ipcMain.handle('invoice:cancel', async (event, { invoiceId, reason }) => {
    try {
      const result = await invoiceService.cancelInvoice(invoiceId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET INVOICE BY ID ─────────────────────────────
  ipcMain.handle('invoice:get-by-id', async (event, invoiceId) => {
    try {
      const result = await invoiceService.getInvoiceById(invoiceId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET INVOICES BY STUDENT ──────────────────────
  ipcMain.handle('invoice:get-by-student', async (event, studentId) => {
    try {
      const result = await invoiceService.getInvoicesByStudent(studentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET INVOICES BY ENROLLMENT ────────────────────
  ipcMain.handle('invoice:get-by-enrollment', async (event, enrollmentId) => {
    try {
      const result = await invoiceService.getInvoicesByEnrollment(enrollmentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

// ─────────────────────────────────────────────────────────────────
// ADDITIONS TO your invoice IPC handlers file (the one with
// registerInvoiceHandlers). Paste these two ipcMain.handle blocks
// inside registerInvoiceHandlers(), alongside the existing ones.
// ─────────────────────────────────────────────────────────────────

  // ─── GET INVOICES BY STATUS ────────────────────────
  ipcMain.handle('invoice:get-by-status', async (event, { status, options }) => {
    try {
      const result = await invoiceService.getInvoicesByStatus(status, options || {});
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── MARK INVOICE AS PAID ──────────────────────────
  ipcMain.handle('invoice:mark-as-paid', async (event, { invoiceId, paidAt }) => {
    try {
      const result = await invoiceService.markInvoiceAsPaid(invoiceId, paidAt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });


}