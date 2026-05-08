import axios from 'axios';

const API = axios.create({ 
  baseURL: 'http://localhost:5000/api' 
});

// Add interceptor to include token in all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getDivisions = () => API.get('/divisions').then(r => r.data);
export const getMajorSections = (id) => API.get(`/major-sections/${id}`).then(r => r.data);
export const getSections = (id) => API.get(`/sections/${id}`).then(r => r.data);
export const getEntries = (params) => API.get('/entries', { params }).then(r => r.data);
export const createEntry = (data) => API.post('/entries', data).then(r => r.data);
export const deleteEntry = (id) => API.delete(`/entries/${id}`).then(r => r.data);
export const getStats = () => API.get('/stats').then(r => r.data);
