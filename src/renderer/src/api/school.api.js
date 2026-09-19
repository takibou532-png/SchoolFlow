import { electronAPI } from '../utils/electron';

export const schoolApi = {
  get: async () => {
    const response = await electronAPI.school.get();
    if (!response.success) throw new Error(response.error);
    return response.data;
  },
  update: async (id, data) => {
    const response = await electronAPI.school.update({ id, data });
    if (!response.success) throw new Error(response.error);
    return response.data;
  },
  selectLogo: async () => {
    const response = await electronAPI.school.selectLogo();
    if (!response.success) throw new Error(response.error);
    return response.filePath;
  },
};