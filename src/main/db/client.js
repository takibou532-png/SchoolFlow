import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { app } from 'electron';
import { getDbPath } from './paths.js';
import * as schema from './index.js';

let sqlite = null;
let db = null;

function getMigrationsFolder() {
  if (app.isPackaged) {
    // In packaged app, migrations are copied to resources via extraResources
    return join(process.resourcesPath, 'migrations');
  }
  // In development, use the source folder
  return join(app.getAppPath(), 'src/main/db/migrations');
}

export function initDatabase() {
  if (db) return db;
  const dbPath = getDbPath();
  const Database = require('better-sqlite3');
  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite, { schema });
  const migrationsFolder = getMigrationsFolder();
  console.log('📁 Migrations folder:', migrationsFolder);
  migrate(db, { migrationsFolder });
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized - call initDatabase() first');
  return db;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}