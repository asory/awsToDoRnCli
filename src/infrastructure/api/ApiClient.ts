import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SecureStorage } from '../storage/SecureStorage';
import { Logger } from '../monitoring/Logger';
import { Config } from '../../shared/config/Config';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = Config.API_BASE_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private async setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await SecureStorage.getSecureItem('accessToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          Logger.error('Error getting auth token:', error as Error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshToken = await SecureStorage.getSecureItem('refreshToken');
            if (refreshToken) {
              // This would call the auth service to refresh
              // For now, just retry the request
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Method to update base URL (useful for different environments)
  setBaseURL(url: string) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }
}