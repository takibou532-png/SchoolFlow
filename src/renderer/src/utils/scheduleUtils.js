// src/renderer/utils/scheduleUtils.js

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Monday-start week, matches SessionService.getSessionsByWeek's own Monday math
export function getMondayOf(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function toISODate(date) {
  return date.toISOString().split('T')[0];
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function formatDayHeader(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Unwraps the { success, data, error } shape every ipcMain.handle in this app returns.
// Throws so callers can use a single try/catch instead of checking .success everywhere.
export async function callApi(promise) {
  const res = await promise;
  if (!res || res.success === false) {
    throw new Error(res?.error || 'Request failed');
  }
  return res.data;
}

export function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;