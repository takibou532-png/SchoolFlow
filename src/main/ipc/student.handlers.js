import { ipcMain } from 'electron';
import { StudentService } from '../services/index.js';
import { dialog } from 'electron';
import { readFileSync } from 'fs';
import { extname } from 'path';
const studentService = new StudentService();

export function registerStudentHandlers() {

ipcMain.handle('student:select-avatar', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const buffer = readFileSync(filePath);
      const ext = extname(filePath).slice(1);
      const dataUrl = `data:image/${ext};base64,${buffer.toString('base64')}`;
      return { success: true, filePath, dataUrl };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── GET AVATAR ────────────────────────────────────
ipcMain.handle('student:get-avatar', async (event, studentId) => {
  try {
    const dataUrl = await studentService.getAvatar(studentId);
    return { success: true, dataUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  // ─── CREATE STUDENT (without enrollment) ───────────
ipcMain.handle('student:create', async (event, data) => {
  try {
    const result = await studentService.createStudent(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── GET STUDENT ENROLLMENTS ─────────────────────
ipcMain.handle('student:get-enrollments', async (event, studentId) => {
  try {
    const result = await studentService.getStudentEnrollments(studentId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
  // ─── GET ALL STUDENTS ──────────────────────────────
  ipcMain.handle('student:get-all', async (event, options = {}) => {
    try {
      const result = await studentService.getAllStudents(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENT BY ID ─────────────────────────────
  ipcMain.handle('student:get-by-id', async (event, id) => {
    try {
      const result = await studentService.getStudent(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENTS BY MODULE ────────────────────────
  ipcMain.handle('student:get-by-module', async (event, { moduleId, options = {} }) => {
    try {
      const result = await studentService.getStudentsByModule(moduleId, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENTS WITH UNPAID INVOICES ────────────
  ipcMain.handle('student:get-with-unpaid-invoices', async () => {
    try {
      const result = await studentService.getStudentsWithUnpaidInvoices();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE STUDENT WITH ENROLLMENT ───────────────
  ipcMain.handle('student:create-with-enrollment', async (event, { studentData, moduleId, notes }) => {
    try {
      const result = await studentService.createStudentWithEnrollment(studentData, moduleId, notes);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── ENROLL STUDENT TO MODULE ─────────────────────
  ipcMain.handle('student:enroll-to-module', async (event, { studentId, moduleId, notes }) => {
    try {
      const result = await studentService.enrollStudentToModule(studentId, moduleId, notes);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── SUSPEND STUDENT FROM MODULE ──────────────────
  ipcMain.handle('student:suspend-from-module', async (event, { studentId, moduleId, reason }) => {
    try {
      const result = await studentService.suspendStudentFromModule(studentId, moduleId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE STUDENT ────────────────────────────────
  ipcMain.handle('student:update', async (event, { id, data }) => {
    try {
      const result = await studentService.updateStudent(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENT ATTENDANCE ────────────────────────
  ipcMain.handle('student:get-attendance', async (event, studentId) => {
    try {
      const result = await studentService.getStudentAttendance(studentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENT STATS ─────────────────────────────
  ipcMain.handle('student:get-stats', async (event, studentId) => {
    try {
      const result = await studentService.getStudentStats(studentId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

}