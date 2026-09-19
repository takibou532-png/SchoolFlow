import { ipcMain } from 'electron';
import { CourseAttendanceService } from '../services/index.js';

const courseAttendanceService = new CourseAttendanceService();

export function registerCourseAttendanceHandlers() {
  // ─── GET ATTENDANCE SHEET ──────────────────────────
  ipcMain.handle('course-attendance:get-sheet', async (event, courseSessionId) => {
    try {
      const result = await courseAttendanceService.getCourseAttendanceSheet(courseSessionId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── MARK ATTENDANCE ───────────────────────────────
  ipcMain.handle('course-attendance:mark', async (event, { courseSessionId, attendanceList }) => {
    try {
      const result = await courseAttendanceService.markCourseAttendance(courseSessionId, attendanceList);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STUDENT COURSE ATTENDANCE ────────────────
  ipcMain.handle('course-attendance:get-student', async (event, { studentId, courseId }) => {
    try {
      const result = await courseAttendanceService.getStudentCourseAttendance(studentId, courseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE ATTENDANCE REPORT ──────────────────
  ipcMain.handle('course-attendance:get-report', async (event, courseId) => {
    try {
      const result = await courseAttendanceService.getCourseAttendanceReport(courseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}