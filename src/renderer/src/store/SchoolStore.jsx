import { create } from 'zustand';

export const useSchoolStore = create((set) => ({
  school: null,
  isLoading: false,
  setSchool: (school) => set({ school }),
  clearSchool: () => set({ school: null }),
}));