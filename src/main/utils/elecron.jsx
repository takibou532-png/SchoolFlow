// Safe access to electronAPI with fallback
export const electronAPI = window.electronAPI || null;

if (!electronAPI) {
  console.warn('⚠️ Electron API not available – running in browser mode?');
  console.warn('window.electronAPI:', window.electronAPI);
}

// Helper to check if API is available
export const isElectronAvailable = () => {
  return electronAPI !== null && typeof electronAPI === 'object';
};

export default electronAPI;