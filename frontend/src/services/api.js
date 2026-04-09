import axios from 'axios';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const checkBatch = (year, branch, section) => {
  return api.get('/api/check-batch', { params: { year, branch, section } });
};

export const uploadBatch = (formData) => {
  return api.post('/api/upload-batch', formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

export const fetchSubjects = (year, semester, branch, section) => {
  return api.get('/api/fetch-subjects', { params: { year, semester, branch, section } });
};

// analyzeSection will be still handled by fetch in the component for streaming
export const ANALYZE_URL = `${API_BASE_URL}/api/analyze-section`;

export default api;
