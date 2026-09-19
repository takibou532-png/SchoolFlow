import { ipcMain, dialog } from 'electron';
import { SchoolService } from '../services/index.js';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

const schoolService = new SchoolService();

export function registerSchoolHandlers() {

  // ─── GET SCHOOL ──────────────────────────────────────
  ipcMain.handle('school:get', async () => {
    try {
      const result = await schoolService.getSchool();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── CREATE SCHOOL ──────────────────────────────────
  ipcMain.handle('school:create', async (event, data) => {
    try {
      const result = await schoolService.createSchool(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── UPDATE SCHOOL ──────────────────────────────────
  ipcMain.handle('school:update', async (event,  id, data ) => {
    try {
      const result = await schoolService.updateSchool(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── SELECT LOGO ────────────────────────────────────
  ipcMain.handle('school:select-logo', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'] }],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const buffer = readFileSync(filePath);
        const ext = extname(filePath).slice(1).toLowerCase();
        let mimeType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        else if (ext === 'webp') mimeType = 'image/webp';
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        return { success: true, filePath, dataUrl };
      }
      return { success: false, canceled: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET LOGO ────────────────────────────────────────
  ipcMain.handle('school:get-logo', async (event, logoPath) => {
    try {
      if (!logoPath) {
        return { success: false, error: 'Logo path is empty' };
      }
      if (!existsSync(logoPath)) {
        return { success: false, error: 'Logo file not found' };
      }
      const buffer = readFileSync(logoPath);
      const ext = extname(logoPath).slice(1).toLowerCase();
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'svg') mimeType = 'image/svg+xml';
      else if (ext === 'webp') mimeType = 'image/webp';
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return { success: true, dataUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── SELECT STAMP ────────────────────────────────────
  ipcMain.handle('school:select-stamp', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] }],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const buffer = readFileSync(filePath);
        const ext = extname(filePath).slice(1).toLowerCase();
        let mimeType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        else if (ext === 'webp') mimeType = 'image/webp';
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        return { success: true, filePath, dataUrl };
      }
      return { success: false, canceled: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET STAMP ───────────────────────────────────────
  ipcMain.handle('school:get-stamp', async () => {
    try {
      const dataUrl = await schoolService.getStampBase64();
      return { success: true, dataUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ─── GET DASHBOARD STATS ────────────────────────────
  ipcMain.handle('school:get-dashboard-stats', async (event, options = {}) => {
    try {
      const result = await schoolService.getDashboardStats(options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

}