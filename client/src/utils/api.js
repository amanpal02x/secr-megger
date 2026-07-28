import axios from 'axios';

const API = axios.create({ 
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api'
});

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
export const getMajorSections = (divId) => API.get('/major-sections', { params: { divisionId: divId } }).then(r => r.data);
export const getSections = (msId) => API.get('/sections', { params: { majorSectionId: msId } }).then(r => r.data);
export const login = (data) => API.post('/auth/login', data).then(r => r.data);
export const sendOtp = (phoneNumber) => API.post('/auth/send-otp', { phoneNumber }).then(r => r.data);
export const verifyOtp = (phoneNumber, otp) => API.post('/auth/verify-otp', { phoneNumber, otp }).then(r => r.data);
export const resetPassword = (phoneNumber, otp, newPassword) => API.post('/auth/reset-password', { phoneNumber, otp, newPassword }).then(r => r.data);
export const getEntries = (params) => API.get('/entries', { params }).then(r => r.data);
export const getEntry = (id) => API.get(`/entries/${id}`).then(r => r.data);
export const createEntry = (data) => API.post('/entries', data).then(r => r.data);
export const createEntriesBulk = (data) => API.post('/entries/bulk', data).then(r => r.data);
export const createLocationsBulk = (data) => API.post('/locations/bulk', data).then(r => r.data);
export const deleteEntry = (id) => API.delete(`/entries/${id}`).then(r => r.data);
export const clearAllEntries = () => API.delete('/entries').then(r => r.data);
export const getStats = () => API.get('/stats').then(r => r.data);
export const getUsers = () => API.get('/users').then(r => r.data);
export const createUser = (data) => API.post('/users', data).then(r => r.data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => API.delete(`/users/${id}`).then(r => r.data);
export const updateProfile = (data) => API.put('/users/profile', data).then(r => r.data);

export const getLocations = () => API.get('/locations').then(r => r.data);
export const createLocation = (data) => API.post('/locations', data).then(r => r.data);
export const updateLocation = (id, data) => API.put(`/locations/${id}`, data).then(r => r.data);
export const deleteLocation = (id) => API.delete(`/locations/${id}`).then(r => r.data);

export const getStations = () => API.get('/stations').then(r => r.data);
export const getOtdrReports = () => API.get('/otdr-reports').then(r => r.data);
export const getMyOtdrReports = () => API.get('/otdr-reports/my').then(r => r.data).catch(err => {
  if (err.response?.status === 404) {
    return API.get('/otdr-reports', { params: { my: 'true' } }).then(r => r.data);
  }
  throw err;
});
export const getOtdrReportById = (id) => API.get(`/otdr-reports/${id}`).then(r => r.data);
export const createOtdrReport = (data) => API.post('/otdr-reports', data).then(r => r.data);
export const deleteOtdrReport = (id) => API.delete(`/otdr-reports/${id}`).then(r => r.data);



