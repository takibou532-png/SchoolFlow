import { ipcMain } from 'electron';
import { ExpenseService } from '../services/index.js';

const expenseService = new ExpenseService();

export function registerExpenseHandlers() {
  // ─── GET ALL ──────────────────────────────────────
  ipcMain.handle('expense:get-all', async (event, options = {}) => {
    try {
      const result = await expenseService.getAllExpenses(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET BY ID ────────────────────────────────────
  ipcMain.handle('expense:get-by-id', async (event, id) => {
    try {
      const result = await expenseService.getExpense(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE ──────────────────────────────────────
  ipcMain.handle('expense:create', async (event, data) => {
    try {
      const result = await expenseService.createExpense(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE ──────────────────────────────────────
  ipcMain.handle('expense:update', async (event, { id, data }) => {
    try {
      const result = await expenseService.updateExpense(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── DELETE ──────────────────────────────────────
  ipcMain.handle('expense:delete', async (event, id) => {
    try {
      const result = await expenseService.deleteExpense(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}