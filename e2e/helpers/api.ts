import { type Page, APIRequestContext } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

// --- Standalone helpers (use page.request, shares auth cookies with the browser) ---

// Per-page default project cache so tests don't create a new project per task
const defaultProjectCache = new WeakMap<object, Promise<{ id: string; name: string }>>();

// Per-page title→id map for resolving blockedBy references
const taskTitleCache = new WeakMap<object, Map<string, string>>();

function getTaskTitleMap(page: Page): Map<string, string> {
  if (!taskTitleCache.has(page)) taskTitleCache.set(page, new Map());
  return taskTitleCache.get(page)!;
}

export async function createProject(
  page: Page,
  name?: string,
): Promise<{ id: string; name: string }> {
  const projectName = name ?? `E2E Project ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const res = await page.request.post(`${BASE_URL}/api/projects`, {
    data: { name: projectName },
  });
  if (!res.ok()) throw new Error(`createProject failed (${res.status()}): ${await res.text()}`);
  return res.json();
}

async function getDefaultProject(page: Page): Promise<{ id: string }> {
  if (!defaultProjectCache.has(page)) {
    defaultProjectCache.set(page, createProject(page));
  }
  return defaultProjectCache.get(page)!;
}

export async function createTask(
  page: Page,
  options: {
    title: string;
    priority?: string;
    status?: string;
    projectId?: string;
    blockedBy?: string[];
    dueDate?: string;
  },
): Promise<{ id: string; title: string }> {
  const projectId = options.projectId ?? (await getDefaultProject(page)).id;
  const res = await page.request.post(`${BASE_URL}/api/tasks`, {
    data: {
      projectId,
      title: options.title,
      status: options.status ?? 'TODO',
      priority: options.priority ?? 'MEDIUM',
      position: 0,
      ...(options.dueDate && { dueDate: new Date(options.dueDate).toISOString() }),
    },
  });
  if (!res.ok()) throw new Error(`createTask failed (${res.status()}): ${await res.text()}`);
  const task = await res.json();

  // Register by title for blockedBy resolution within the same test
  getTaskTitleMap(page).set(options.title, task.id);

  if (options.blockedBy?.length) {
    for (const blockingTitle of options.blockedBy) {
      const blockingId = getTaskTitleMap(page).get(blockingTitle);
      if (blockingId) {
        await page.request.post(`${BASE_URL}/api/tasks/${task.id}/dependencies`, {
          data: { blockingTaskId: blockingId },
        });
      }
    }
  }

  return task;
}

// --- Class-based helper (uses APIRequestContext, for tests that need a separate request context) ---

export class ApiHelper {
  private request: APIRequestContext;
  private baseUrl: string;

  constructor(request: APIRequestContext, baseUrl = BASE_URL) {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string) {
    const response = await this.request.post(`${this.baseUrl}/api/auth/login`, {
      data: { email, password },
    });
    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }
    return response.json();
  }

  async createProject(name: string, description: string = '') {
    const response = await this.request.post(`${this.baseUrl}/api/projects`, {
      data: { name, description },
    });
    if (!response.ok()) throw new Error(`Create project failed: ${await response.text()}`);
    return response.json();
  }

  async createTask(projectId: string, title: string, options: { status?: string; priority?: string; dueDate?: string } = {}) {
    const { status = 'TODO', priority = 'MEDIUM', dueDate } = options;
    const response = await this.request.post(`${this.baseUrl}/api/tasks`, {
      data: {
        projectId, title, status, priority, position: 0,
        ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
      },
    });
    if (!response.ok()) throw new Error(`Create task failed: ${await response.text()}`);
    return response.json();
  }

  async updateTask(taskId: string, data: Record<string, unknown>) {
    const response = await this.request.put(`${this.baseUrl}/api/tasks/${taskId}`, { data });
    if (!response.ok()) throw new Error(`Update task failed: ${await response.text()}`);
    return response.json();
  }

  async addDependency(blockedId: string, blockingId: string) {
    const response = await this.request.post(`${this.baseUrl}/api/tasks/${blockedId}/dependencies`, {
      data: { blockingTaskId: blockingId },
    });
    if (!response.ok()) throw new Error(`Add dependency failed: ${await response.text()}`);
    return response.json();
  }

  async removeDependency(blockedId: string, dependencyId: string) {
    const response = await this.request.delete(
      `${this.baseUrl}/api/tasks/${blockedId}/dependencies/${dependencyId}`,
    );
    if (!response.ok()) throw new Error(`Remove dependency failed: ${await response.text()}`);
  }
}
