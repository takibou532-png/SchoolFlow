import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export function getDbPath() {
  const userDataDir = app.getPath('userData');
  const dataDir = join(userDataDir, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, 'school.db');
}

export function getBackupDir() {
  const userDataDir = app.getPath('userData');
  const backupDir = join(userDataDir, 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}