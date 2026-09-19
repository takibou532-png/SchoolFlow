import { ipcMain, BrowserWindow, app, shell } from 'electron';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

/**
 * Prints arbitrary HTML content using the native OS print dialog.
 * Note: Electron's own print dialog does not support a live preview pane —
 * it will show "This app doesn't support print preview" in the right-hand
 * panel. That's cosmetic; printing itself still works correctly. Kept here
 * for any flows that want direct-to-dialog printing.
 */
function printHtml(html, options = {}) {
  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print(
        {
          silent: options.silent ?? false,
          printBackground: true,
          deviceName: options.deviceName || '',
          margins: { marginType: 'default' },
          ...options,
        },
        (success, failureReason) => {
          printWindow.close();
          if (success) resolve({ success: true });
          else resolve({ success: false, error: failureReason });
        }
      );
    });

    printWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      printWindow.close();
      reject(new Error(`Failed to load print content: ${desc} (${code})`));
    });

    printWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html));
  });
}

/**
 * Renders HTML to a PDF Buffer using a hidden BrowserWindow.
 */
function renderHtmlToPdfBuffer(html, pdfOptions = {}) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({ show: false });

    win.webContents.on('did-finish-load', async () => {
      try {
        const data = await win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          ...pdfOptions,
        });
        win.close();
        resolve(data);
      } catch (err) {
        win.close();
        reject(err);
      }
    });

    win.webContents.on('did-fail-load', (_e, code, desc) => {
      win.close();
      reject(new Error(`Failed to load PDF content: ${desc} (${code})`));
    });

    win.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html));
  });
}

/**
 * Full "Option B" flow: renders HTML to PDF, writes it to a temp file, and
 * opens it with the OS's default PDF viewer via shell.openPath(). This gives
 * the user a real, native preview (their actual PDF reader) with zero custom
 * UI — and it completely sidesteps Electron's print-dialog preview limitation,
 * since we never touch webContents.print() at all in this flow.
 *
 * @param {string} html
 * @param {object} options - { fileName, pdfOptions }
 */
async function generateAndOpenPdf(html, options = {}) {
  const pdfBuffer = await renderHtmlToPdfBuffer(html, options.pdfOptions);

  const tempDir = join(app.getPath('temp'), 'school-app-prints');
  await mkdir(tempDir, { recursive: true });

  const safeName = (options.fileName || `document-${randomUUID()}`).replace(/[^a-z0-9\-_.\u0600-\u06FF ]/gi, '_');
  const filePath = join(tempDir, `${safeName}.pdf`);

  await writeFile(filePath, pdfBuffer);

  // shell.openPath opens the file in the user's default PDF viewer (Edge,
  // Acrobat, Preview, etc.) — this IS the "real preview" the OS print dialog
  // can't give us, and from there the user can print or save as they like.
  const openError = await shell.openPath(filePath);
  if (openError) {
    throw new Error(`Failed to open PDF: ${openError}`);
  }

  return { filePath };
}

export function registerPrintHandlers() {
  // Direct-to-dialog print (kept for any flow that wants it — e.g. silent printing)
  ipcMain.handle('print:html', async (_event, html, options) => {
    try {
      const result = await printHtml(html, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Raw PDF buffer, in case a caller wants to handle saving/opening itself
  ipcMain.handle('print:pdf', async (_event, html, options) => {
    try {
      const buffer = await renderHtmlToPdfBuffer(html, options);
      return { success: true, data: buffer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // "Option B" — generate PDF, save to temp, open in the OS default viewer
  ipcMain.handle('print:open-pdf', async (_event, html, options) => {
    try {
      const result = await generateAndOpenPdf(html, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}