import { ipcMain } from 'electron';
import { ClassroomService } from '../services/index.js';

const classroomService = new ClassroomService();

export function registerClassroomHandlers() {
  // ─── GET ALL CLASSROOMS ────────────────────────────
  ipcMain.handle('classroom:get-all', async (event, options = {}) => {
    try {
      const result = await classroomService.getAllClassrooms(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET CLASSROOM BY ID ────────────────────────────
  ipcMain.handle('classroom:get-by-id', async (event, id) => {
    try {
      const result = await classroomService.getClassroom(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE CLASSROOM ──────────────────────────────
  ipcMain.handle('classroom:create', async (event, data) => {
    try {
      const result = await classroomService.createClassroom(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE CLASSROOM ──────────────────────────────
  ipcMain.handle('classroom:update', async (event, { id, data }) => {
    try {
      const result = await classroomService.updateClassroom(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── DELETE CLASSROOM ──────────────────────────────
  ipcMain.handle('classroom:delete', async (event, id) => {
    try {
      const result = await classroomService.deleteClassroom(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── RESTORE CLASSROOM ─────────────────────────────
  ipcMain.handle('classroom:restore', async (event, id) => {
    try {
      const result = await classroomService.restoreClassroom(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}