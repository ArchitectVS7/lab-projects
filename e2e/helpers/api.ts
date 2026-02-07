import { APIRequestContext } from '@playwright/test';

export class ApiHelper {
    private request: APIRequestContext;
    private baseUrl: string;
    private token: string | null = null;

    constructor(request: APIRequestContext, baseUrl: string = 'http://127.0.0.1:4000') {
        this.request = request;
        this.baseUrl = baseUrl;
    }

    async login(email: string, password: string) {
        const response = await this.request.post(`${this.baseUrl}/api/auth/login`, {
            data: { email, password }
        });
        if (!response.ok()) {
            throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
        }
        const data = await response.json();
        this.token = data.user.id; // Wait, login returns { message, user }. No token in body? 
        // Token is in cookie. But for API calls via request, we need it in header?
        // Middleware `authenticate` checks `req.cookies.token || header`.
        // If we use `request` from playwright which shares state with `page` (if using same context), cookies might be set.
        // But `request` fixture is separate usually unless using `page.request`.
        // If `setAuthCookie` sets cookie, verify if response has set-cookie.

        // Actually, the previous implementation assumed token in response.
        // Backend: `setAuthCookie(res, token)`.
        // Response body: `{ message, user }`. No token.
        // So we must rely on Cookies.

        // If we use the SAME `request` context, it handles cookies.
        return data;
    }

    async createProject(name: string, description: string = '') {
        const response = await this.request.post(`${this.baseUrl}/api/projects`, {
            // Headers usually handled by cookie if login was done on same context
            headers: this.getHeaders(),
            data: { name, description }
        });
        if (!response.ok()) throw new Error(`Create project failed: ${await response.text()}`);
        return await response.json();
    }

    async createTask(projectId: string, title: string, options: { status?: string; priority?: string } = {}) {
        const { status = 'TODO', priority = 'MEDIUM' } = options;
        const response = await this.request.post(`${this.baseUrl}/api/tasks`, {
            headers: this.getHeaders(),
            data: { projectId, title, status, priority, position: 0 }
        });
        if (!response.ok()) throw new Error(`Create task failed: ${await response.text()}`);
        return await response.json();
    }

    async addDependency(blockedId: string, blockingId: string) {
        // blockedId in URL, blockingId in body as blockingTaskId
        const response = await this.request.post(`${this.baseUrl}/api/tasks/${blockedId}/dependencies`, {
            headers: this.getHeaders(),
            data: { blockingTaskId: blockingId }
        });
        if (!response.ok()) throw new Error(`Add dependency failed: ${await response.text()}`);
        return await response.json();
    }

    async removeDependency(blockedId: string, dependencyId: string) {
        const response = await this.request.delete(`${this.baseUrl}/api/tasks/${blockedId}/dependencies/${dependencyId}`, {
            headers: this.getHeaders()
        });
        if (!response.ok()) throw new Error(`Remove dependency failed: ${await response.text()}`);
    }

    private getHeaders() {
        // If using cookies, no auth header needed?
        // But if we want to be explicit, we'd need the token.
        // If login response doesn't give token, we can't set Auth header easily without parsing Set-Cookie.
        // Playwright `request` handles cookies automatically.
        return {
            'Content-Type': 'application/json'
        };
    }
}
