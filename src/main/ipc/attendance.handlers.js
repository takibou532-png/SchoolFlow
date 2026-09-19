import { ipcMain } from 'electron';
import { AttendanceService, TeacherAttendanceService } from '../services/index.js';

const attendanceService = new AttendanceService();
const teacherAttendanceService = new TeacherAttendanceService();

export function registerAttendanceHandlers() {
  // ─── GET ATTENDANCE SHEET ──────────────────────────
  ipcMain.handle('attendance:get-sheet', async (event, sessionId) => {
    try {
      const result = await attendanceService.getAttendanceSheet(sessionId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── MARK ATTENDANCE ───────────────────────────────
  ipcMain.handle('attendance:mark', async (event, { sessionId, attendanceList }) => {
    try {
      const result = await attendanceService.markAttendance(sessionId, attendanceList);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENT ATTENDANCE BY CYCLE ──────────────
  ipcMain.handle('attendance:get-student-by-cycle', async (event, { studentId, moduleId, cycleNumber }) => {
    try {
      const result = await attendanceService.getStudentAttendanceByCycle(studentId, moduleId, cycleNumber);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── TEACHER ATTENDANCE ────────────────────────────
  ipcMain.handle('attendance:teacher-auto-update', async () => {
    try {
      const result = await teacherAttendanceService.autoUpdateTeacherAttendance();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('attendance:teacher-get-by-cycle', async (event, { teacherId, moduleId, cycleNumber }) => {
    try {
      const result = await teacherAttendanceService.getTeacherAttendanceByCycle(teacherId, moduleId, cycleNumber);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('attendance:teacher-get-by-date-range', async (event, { teacherId, startDate, endDate }) => {
    try {
      const result = await teacherAttendanceService.getTeacherAttendanceByDateRange(teacherId, startDate, endDate);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}