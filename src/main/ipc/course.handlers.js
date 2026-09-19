import { ipcMain } from 'electron';
import { CourseService } from '../services/index.js';

const courseService = new CourseService();

export function registerCourseHandlers() {
  // ─── GET ALL COURSES ───────────────────────────────
  ipcMain.handle('course:get-all', async (event, options = {}) => {
    try {
      const result = await courseService.getAllCourses(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE BY ID ──────────────────────────────
  ipcMain.handle('course:get-by-id', async (event, id) => {
    try {
      const result = await courseService.getCourse(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET COURSE WITH SESSIONS ──────────────────────
  ipcMain.handle('course:get-with-sessions', async (event, courseId) => {
    try {
      const result = await courseService.getCourseWithSessions(courseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE COURSE WITH SESSIONS ──────────────────
  ipcMain.handle('course:create-with-sessions', async (event, dto) => {
    try {
      const result = await courseService.createCourseWithSessions(dto);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE COURSE ──────────────────────────────────
  ipcMain.handle('course:update', async (event, { courseId, data }) => {
    try {
      const result = await courseService.updateCourse(courseId, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── ARCHIVE COURSE ─────────────────────────────────
  ipcMain.handle('course:archive', async (event, courseId) => {
    try {
      const result = await courseService.archiveCourse(courseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL COURSE ──────────────────────────────────
  ipcMain.handle('course:cancel', async (event, { courseId, reason }) => {
    try {
      const result = await courseService.cancelCourse(courseId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('course:get-sessions', async (event, courseId) => {
  try {
    const result = await courseService.getCourseSessions(courseId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
}