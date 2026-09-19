import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';

import { initDatabase } from './db/client.js';
import { registerAllHandlers } from './ipc/index.js';
import {
  InvoiceService,
  TeacherAttendanceService,
  SchoolService,
} from './services/index.js';

// ─── Get __dirname equivalent in ES modules ─────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Register all IPC handlers BEFORE app is ready ──────

registerAllHandlers();

// ─── Background Tasks ───────────────────────────────────

async function runBackgroundTasks() {
  try {
    const invoiceService = new InvoiceService();
    await invoiceService.generateInvoices({ onlyCurrentCycle: true });
    console.log('✅ Invoices generated on startup');
  } catch (error) {
    console.error('❌ Startup invoice generation failed:', error);
  }

  try {
    const teacherAttendance = new TeacherAttendanceService();
    await teacherAttendance.autoUpdateTeacherAttendance();
    console.log('✅ Teacher attendance updated on startup');
  } catch (error) {
    console.error('❌ Startup teacher attendance update failed:', error);
  }
}

// ─── Renderer path resolution (the part that was breaking) ─

/**
 * Tries a list of candidate paths for index.html and returns the first
 * one that actually exists on disk. Logs everything so if it still fails
 * on Windows you get a real diagnostic instead of file:///C:/.
 */
function resolveRendererIndexHtml() {
  const appPath = app.getAppPath(); // e.g. .../resources/app.asar in packaged build
  const resourcesPath = process.resourcesPath;

  console.log('🔎 Diagnostics:');
  console.log('   __dirname       =', __dirname);
  console.log('   app.getAppPath()=', appPath);
  console.log('   resourcesPath   =', resourcesPath);
  console.log('   app.isPackaged  =', app.isPackaged);

  // Add/remove candidates here to match your actual build output.
  // Order matters: first existing match wins.
  const candidates = [
    join(__dirname, '../renderer/index.html'),   // original relative-to-compiled-main guess
    join(__dirname, 'renderer/index.html'),      // in case main.js and renderer end up siblings
    join(appPath, 'renderer/index.html'),        // relative to app root instead of __dirname
    join(appPath, 'dist/renderer/index.html'),   // common vite-electron layout
    join(appPath, 'out/renderer/index.html'),    // electron-vite default output folder
  ];

  console.log('🔎 Candidate renderer paths:');
  for (const c of candidates) {
    console.log('   ', existsSync(c) ? '✅ EXISTS' : '❌ missing', '->', c);
  }

  const found = candidates.find((c) => existsSync(c));

  if (!found) {
    console.error('❌ Could not find index.html in any candidate location.');
    try {
      console.error('   Contents of appPath:', readdirSync(appPath));
    } catch (e) {
      console.error('   Could not read appPath contents:', e.message);
    }
    // Fall back to the original guess so the error you see downstream
    // is still the familiar ERR_FILE_NOT_FOUND with a real (wrong) path,
    // never a blank one.
    return candidates[0];
  }

  return found;
}

// ─── Create Window ──────────────────────────────────────

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,

    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },

    icon: join(__dirname, '../../build/icon.ico'),
  });

  // ==========================================
  // RENDERER DEBUGGING
  // ==========================================

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] level=${level}`, message, `(${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
 
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
 
  });

  mainWindow.webContents.on('unresponsive', () => {
  
  });

  mainWindow.webContents.on('responsive', () => {
  
  });

  mainWindow.webContents.on('did-finish-load', () => {
 
  });

  // ==========================================
  // LOAD RENDERER
  // ==========================================

  // Use app.isPackaged instead of NODE_ENV: NODE_ENV is not reliably set
  // in a packaged Windows build, so this is a more trustworthy check.
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const rendererPath = resolveRendererIndexHtml();

   

    if (!existsSync(rendererPath)) {
   
    }

    mainWindow.loadFile(rendererPath);
    mainWindow.webContents.openDevTools();
  }
}

// ─── App Lifecycle ──────────────────────────────────────

app.whenReady().then(async () => {
  try {
    initDatabase();
    console.log('✅ Database initialized');

    const schoolService = new SchoolService();
    const school = await schoolService.getSchool();

    if (!school) {
      await schoolService.repository.create({
        name: 'My School',
        createdAt: new Date().toISOString(),
      });
      console.log('✅ Default school created');
    }

    await runBackgroundTasks();

    createWindow();
  } catch (error) {
    console.error('❌ App startup failed:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ─── Close behavior ────────────────────────────────────

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});