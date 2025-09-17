import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SecureStorage } from '../storage/SecureStorage';
import { Logger } from '../monitoring/Logger';
import amplifyConfig from '../../../backend/amplify_outputs.json';
import { store } from '../../application/store';
import { refreshTokenSuccess, logout } from '../../application/slices/authSlice';
import { CognitoService } from '../services/CognitoService';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private static instance: ApiClient;

  constructor(baseURL: string = (amplifyConfig as any).data?.url ||
    (amplifyConfig as any).api?.[0]?.endpoint ||
    'https://localhost:3000/api') {
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

  static getInstance(baseURL?: string): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(baseURL);
    }
    return ApiClient.instance;
  }

  private async setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await SecureStorage.getToken('access');
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

    // Response interceptor to handle token refresh and 403 errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
           originalRequest._retry = true;

           try {
             const refreshToken = await SecureStorage.getToken('refresh');
             if (!refreshToken) {
               Logger.error('No refresh token available for automatic refresh');

               await SecureStorage.removeToken('access');
               await SecureStorage.removeToken('refresh');
               store.dispatch(logout());
               return Promise.reject(error);
             }

             // Import auth service dynamically to avoid circular dependencies
             const cognitoService = new CognitoService();
             const newTokens = await cognitoService.refreshToken(refreshToken);

             // Store new tokens with expiration
             await SecureStorage.storeToken('access', newTokens.accessToken, newTokens.expiresIn ? (newTokens.expiresIn - Date.now()) / 1000 : undefined);
             if (newTokens.refreshToken) {
               await SecureStorage.storeToken('refresh', newTokens.refreshToken);
             }

             store.dispatch(refreshTokenSuccess(newTokens));

             if (originalRequest.headers) {
               originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
             }

             return this.client(originalRequest);
           } catch (refreshError) {
            Logger.error('Token refresh failed:', refreshError as Error);
            try {
              await SecureStorage.removeToken('access');
              await SecureStorage.removeToken('refresh');
              store.dispatch(logout());
            } catch (cleanupError) {
              Logger.error('Error during logout cleanup:', cleanupError as Error);
            }
          }
        }

        if (error.response?.status === 403) {
          Logger.error('403 Forbidden: Insufficient permissions', error.response.data);
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

  clearAuthTokens() {

    delete this.client.defaults.headers.common.Authorization;
    this.client.interceptors.request.clear();
    this.setupInterceptors();

  }

  setBaseURL(url: string) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }
}