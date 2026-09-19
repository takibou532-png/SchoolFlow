import { ipcMain } from 'electron';
import { EmployeeService } from '../services/index.js';

const employeeService = new EmployeeService();

export function registerEmployeeHandlers() {
  ipcMain.handle('employee:get-all', async (event, options) => {
    try {
      const result = await employeeService.getAllEmployees(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee:get-by-id', async (event, id) => {
    try {
      const result = await employeeService.getEmployee(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee:create', async (event, data) => {
    try {
      const result = await employeeService.createEmployee(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee:update', async (event, { id, data }) => {
    try {
      const result = await employeeService.updateEmployee(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee:delete', async (event, id) => {
    try {
      const result = await employeeService.deleteEmployee(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employee:restore', async (event, id) => {
    try {
      const result = await employeeService.restoreEmployee(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}