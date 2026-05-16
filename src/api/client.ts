import axios from 'axios';

// Singleton Axios Instance
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pdks_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 hatasında oturumu kapat
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pdks_token');
      localStorage.removeItem('pdks_user');
      // Sadece ana sayfada değilsek yönlendir (Sonsuz döngüyü engelle)
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      } else {
        // Zaten ana sayfadaysak sadece state'in güncellenmesi için bir event fırlatabiliriz
        window.dispatchEvent(new Event('auth_error'));
      }
    }
    return Promise.reject(error);
  }
);
