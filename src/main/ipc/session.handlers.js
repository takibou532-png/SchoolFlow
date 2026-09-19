import { ipcMain } from 'electron';
import { SessionService } from '../services/index.js';

const sessionService = new SessionService();

export function registerSessionHandlers() {
  // ─── GET SESSION BY ID ─────────────────────────────
  ipcMain.handle('session:get-by-id', async (event, id) => {
    try {
      const result = await sessionService.getSession(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE ADDITIONAL SESSION ─────────────────────
  ipcMain.handle('session:create-additional', async (event, dto) => {
    try {
      const result = await sessionService.createAdditionalSession(dto);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE SESSION ────────────────────────────────
  ipcMain.handle('session:update', async (event, { sessionId, data }) => {
    try {
      const result = await sessionService.updateSession(sessionId, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CANCEL SESSION ────────────────────────────────
  ipcMain.handle('session:cancel', async (event, sessionId) => {
    try {
      const result = await sessionService.cancelSession(sessionId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET SESSIONS BY DAY ───────────────────────────
  ipcMain.handle('session:get-by-day', async (event, { date, options = {} }) => {
    try {
      const result = await sessionService.getSessionsByDay(date, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET SESSIONS BY WEEK ──────────────────────────
  ipcMain.handle('session:get-by-week', async (event, { weekStart, options = {} }) => {
    try {
      const result = await sessionService.getSessionsByWeek(weekStart, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}