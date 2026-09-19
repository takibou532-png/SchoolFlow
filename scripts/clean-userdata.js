import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

// Mirrors Electron's app.getPath('userData') resolution on Windows/macOS/Linux
// without needing to boot Electron itself. Adjust 'YourAppName' to match
// productName / name in your package.json exactly (case-sensitive).
const APP_NAME = 'schoolFlow';

function getUserDataPath() {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), APP_NAME);
    case 'darwin':
      return join(home, 'Library', 'Application Support', APP_NAME);
    default:
      return join(home, '.config', APP_NAME);
  }
}

const userDataPath = getUserDataPath();

if (existsSync(userDataPath)) {
  rmSync(userDataPath, { recursive: true, force: true });
  console.log('🗑️  Cleared userData:', userDataPath);
} else {
  console.log('ℹ️  No userData folder found at:', userDataPath, '(already clean)');
}