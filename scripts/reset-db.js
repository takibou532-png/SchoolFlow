import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

const APP_NAME = 'schoolflow'; // must match productName in package.json

const dataDir = join(os.homedir(), 'AppData', 'Roaming', APP_NAME, 'data');

if (existsSync(dataDir)) {
  rmSync(dataDir, { recursive: true, force: true });
  console.log('🗑️  Database reset:', dataDir);
} else {
  console.log('ℹ️  Already clean:', dataDir);
}