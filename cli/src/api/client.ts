import axios, { AxiosInstance, AxiosError } from 'axios';
import chalk from 'chalk';
import { config } from '../config/store.js';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.baseUrl + '/api',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add API key to all requests
        this.client.interceptors.request.use((config) => {
            const apiKey = this.getApiKey();
            if (apiKey) {
                config.headers['X-API-Key'] = apiKey;
            }
            return config;
        });

        // Handle errors globally
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                this.handleError(error);
                return Promise.reject(error);
            }
        );
    }

    private getApiKey(): string | undefined {
        return config.apiKey;
    }

    private handleError(error: AxiosError): void {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data: any = error.response.data;

            if (status === 401) {
                console.error(chalk.red('Authentication failed. Please run `taskman login` first.'));
            } else if (status === 403) {
                console.error(chalk.red('Permission denied.'));
            } else if (status === 404) {
                console.error(chalk.red(data?.error || 'Resource not found.'));
            } else {
                console.error(chalk.red(data?.error || `Server error: ${status}`));
            }
        } else if (error.request) {
            // Request made but no response
            console.error(chalk.red(`Cannot connect to server at ${config.baseUrl}`));
            console.error(chalk.yellow('Make sure the TaskMan server is running.'));
        } else {
            // Error setting up request
            console.error(chalk.red('Request error:', error.message));
        }
    }

    // API methods
    async get<T = any>(url: string, params?: any): Promise<T> {
        const response = await this.client.get<T>(url, { params });
        return response.data;
    }

    async post<T = any>(url: string, data?: any): Promise<T> {
        const response = await this.client.post<T>(url, data);
        return response.data;
    }

    async put<T = any>(url: string, data?: any): Promise<T> {
        const response = await this.client.put<T>(url, data);
        return response.data;
    }

    async patch<T = any>(url: string, data?: any): Promise<T> {
        const response = await this.client.patch<T>(url, data);
        return response.data;
    }

    async delete<T = any>(url: string): Promise<T> {
        const response = await this.client.delete<T>(url);
        return response.data;
    }

    updateBaseUrl(baseUrl: string): void {
        this.client.defaults.baseURL = baseUrl + '/api';
    }
}

export const api = new ApiClient();
