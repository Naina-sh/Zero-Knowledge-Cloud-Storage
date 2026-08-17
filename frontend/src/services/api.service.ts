/**
 * API service — Axios HTTP client with JWT auth interceptor and token refresh.
 * @module services/api.service
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from '../config';
import type { ApiResponse } from '../types';

// Token storage — in-memory (not persisted for security)
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Create the Axios instance with base configuration.
 * withCredentials: true — sends the refresh token cookie automatically.
 * No global Content-Type is forced — axios sets it based on the request body
 * (application/json for objects, multipart/form-data + boundary for FormData).
 */
const api: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  withCredentials: true,
  timeout: 30000,
});

// ─── Request interceptor — attach access token ───
api.interceptors.request.use(
  (req: InternalAxiosRequestConfig) => {
    if (accessToken) {
      req.headers.Authorization = `Bearer ${accessToken}`;
    }
    return req;
  },
  (err) => Promise.reject(err)
);

// ─── Response interceptor — auto refresh on 401 ───
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${config.api.baseUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = response.data.data?.accessToken;
        if (!newToken) throw new Error('No access token in refresh response');

        setAccessToken(newToken);
        onRefreshed(newToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        setAccessToken(null);
        onRefreshed('');
        // Redirect to login — token refresh failed
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
