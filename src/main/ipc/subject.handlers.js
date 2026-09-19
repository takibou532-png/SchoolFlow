import { ipcMain } from 'electron';
import { SubjectService } from '../services/index.js';

const subjectService = new SubjectService();

export function registerSubjectHandlers() {
  // ─── GET ALL SUBJECTS ──────────────────────────────
  ipcMain.handle('subject:get-all', async (event, options = {}) => {
    try {
      const result = await subjectService.getAllSubjects(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET SUBJECT BY ID ─────────────────────────────
  ipcMain.handle('subject:get-by-id', async (event, id) => {
    try {
      const result = await subjectService.getSubject(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE SUBJECT ─────────────────────────────────
  ipcMain.handle('subject:create', async (event, data) => {
    try {
      const result = await subjectService.createSubject(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE SUBJECT ─────────────────────────────────
  ipcMain.handle('subject:update', async (event, { id, data }) => {
    try {
      const result = await subjectService.updateSubject(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── DELETE SUBJECT ─────────────────────────────────
  ipcMain.handle('subject:delete', async (event, id) => {
    try {
      const result = await subjectService.deleteSubject(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── RESTORE SUBJECT ────────────────────────────────
  ipcMain.handle('subject:restore', async (event, id) => {
    try {
      const result = await subjectService.restoreSubject(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}