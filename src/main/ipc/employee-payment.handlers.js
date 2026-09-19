import { ipcMain } from 'electron';
import { EmployeePaymentService } from '../services/index.js';

const employeePaymentService = new EmployeePaymentService();

export function registerEmployeePaymentHandlers() {
  ipcMain.handle('employee-payment:get-all', async (event, options) => {
    try {
      const result = await employeePaymentService.getAllPayments(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee-payment:get-by-employee', async (event, employeeId) => {
    try {
      const result = await employeePaymentService.getPaymentsByEmployee(employeeId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee-payment:get-by-id', async (event, id) => {
    try {
      const result = await employeePaymentService.getPayment(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee-payment:create', async (event, data) => {
    try {
      const result = await employeePaymentService.createPayment(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee-payment:update', async (event, { id, data }) => {
    try {
      const result = await employeePaymentService.updatePayment(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee-payment:mark-paid', async (event, { id, paidAt }) => {
    try {
      const result = await employeePaymentService.markAsPaid(id, paidAt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee-payment:delete', async (event, id) => {
    try {
      const result = await employeePaymentService.deletePayment(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}