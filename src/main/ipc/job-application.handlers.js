import { ipcMain, dialog, shell } from 'electron';
import { JobApplicationService } from '../services/index.js';

const jobApplicationService = new JobApplicationService();

export function registerJobApplicationHandlers() {
  // ─── GET ALL ──────────────────────────────────────
  ipcMain.handle('job-application:get-all', async (event, options) => {
    try {
      const result = await jobApplicationService.getApplications(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET BY ID ────────────────────────────────────
  ipcMain.handle('job-application:get-by-id', async (event, id) => {
    try {
      const result = await jobApplicationService.getApplication(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE ────────────────────────────────────────
  ipcMain.handle('job-application:create', async (event, data) => {
    try {
      const result = await jobApplicationService.createApplication(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE ────────────────────────────────────────
  ipcMain.handle('job-application:update', async (event, { id, data }) => {
    try {
      const result = await jobApplicationService.updateApplication(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── DELETE ────────────────────────────────────────
  ipcMain.handle('job-application:delete', async (event, id) => {
    try {
      const result = await jobApplicationService.deleteApplication(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── SELECT CV FILE (dialog) ──────────────────────
  ipcMain.handle('job-application:select-cv', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── DOWNLOAD CV (open with default viewer) ──────
 ipcMain.handle('job-application:open-cv', async (event, id) => {
  try {
    const app = await jobApplicationService.getApplication(id);
    if (!app || !app.cvPath) {
      return { success: false, error: 'السيرة الذاتية غير موجودة' };
    }
    const result = await shell.openPath(app.cvPath);
    if (result) {
      return { success: false, error: result };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle('job-application:get-by-subject', async (event, subjectId) => {
  try {
    const result = await jobApplicationService.getApplicationsBySubject(subjectId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
}