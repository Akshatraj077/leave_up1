import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api/employee"
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hrms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
      window.location.href = '/login';
    }
    if (error.response && error.response.status === 403 && error.response.data?.forcePasswordReset) {
      if (!window.location.pathname.includes('/profile')) {
        window.location.href = '/profile?forcePasswordReset=true';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
