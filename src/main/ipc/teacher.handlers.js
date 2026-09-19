import { ipcMain } from 'electron';
import { TeacherService } from '../services/index.js';
import { dialog } from 'electron';
import { readFileSync } from 'fs';
import { extname } from 'path';
const teacherService = new TeacherService();

export function registerTeacherHandlers() {


ipcMain.handle('teacher:select-avatar', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const buffer = readFileSync(filePath);
      const ext = extname(filePath).slice(1).toLowerCase();
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'png' ? 'image/png' :
                       ext === 'gif' ? 'image/gif' :
                       ext === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return { success: true, filePath, dataUrl };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('teacher:get-avatar', async (event, teacherId) => {
  try {
    const dataUrl = await teacherService.getAvatar(teacherId);
    return { success: true, dataUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


  ipcMain.handle('teacher:get-all', async (event, options = {}) => {
    try {
      const result = await teacherService.getAllTeachers(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('teacher:get-by-id', async (event, id) => {
    try {
      const result = await teacherService.getTeacher(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('teacher:create', async (event, data) => {
    try {
      const result = await teacherService.createTeacher(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('teacher:update', async (event, { id, data }) => {
    try {
      const result = await teacherService.updateTeacher(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('teacher:delete', async (event, id) => {
    try {
      const result = await teacherService.deleteTeacher(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('teacher:restore', async (event, id) => {
    try {
      const result = await teacherService.restoreTeacher(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}