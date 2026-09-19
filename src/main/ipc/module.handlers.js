import { ipcMain } from 'electron';
import { ModuleService } from '../services/index.js';

const moduleService = new ModuleService();

export function registerModuleHandlers() {


  // ─── GET MODULE BY ID ──────────────────────────────
  ipcMain.handle('module:get-by-id', async (event, id) => {
    try {
      const result = await moduleService.getModule(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });


  // ─── CREATE MODULE WITH SESSIONS ──────────────────
  ipcMain.handle('module:create-with-sessions', async (event, dto) => {
    try {
      const result = await moduleService.createModuleWithSessions(dto);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET ALL MODULES (with details) ──────────────
ipcMain.handle('module:get-all', async (event, options = {}) => {
  try {
    const result = await moduleService.getModulesWithDetails(options);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  // ─── ARCHIVE MODULE ────────────────────────────────
  ipcMain.handle('module:archive', async (event, moduleId) => {
    try {
      const result = await moduleService.archiveModule(moduleId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE MODULE SCHEDULE ────────────────────────
// ─── UPDATE MODULE SCHEDULE ────────────────────────
ipcMain.handle('module:update-schedule', async (event, { moduleId, slotUpdates }) => {
  try {
    const result = await moduleService.updateModuleSchedule(moduleId, slotUpdates);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  // ─── GET MODULE STUDENTS ───────────────────────────
  ipcMain.handle('module:get-students', async (event, moduleId) => {
    try {
      const result = await moduleService.getModuleStudents(moduleId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });


  ipcMain.handle('module:get-with-details', async (event, moduleId) => {
  try {
    const result = await moduleService.getModuleWithDetails(moduleId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  // ─── GET MODULE SESSIONS ───────────────────────────
  ipcMain.handle('module:get-sessions', async (event, moduleId) => {
    try {
      const result = await moduleService.getModuleSessions(moduleId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET MODULE REVENUE ────────────────────────────
  ipcMain.handle('module:get-revenue', async (event, moduleId) => {
    try {
      const result = await moduleService.getMonthlyRevenue(moduleId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
 // ─── GET MODULE SCHEDULE SLOTS ─────────────────────
ipcMain.handle('module:get-schedule-slots', async (event, moduleId) => {
  try {
    const result = await moduleService.getModuleScheduleSlots(moduleId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


ipcMain.handle('module:get-all-schedule', async (event) => {
  try {
    const result = await moduleService.getAllModulesSchedule();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
}