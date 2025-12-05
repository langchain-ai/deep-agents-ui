/**
 * HTTP API 客户端
 * 用于与 DeepAgents 后端进行 REST API 通信
 */

// 环境变量配置
// 开发环境: http://localhost:8000
// 生产环境: 通过 NEXT_PUBLIC_API_URL 配置
const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 开发环境默认值
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  
  // 生产环境默认值（可以根据实际情况修改）
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

interface ApiError extends Error {
  code?: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取当前 API 基础 URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 动态设置 API 基础 URL
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * 设置认证 token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * 获取当前 token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 构建请求头
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * 发送请求
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(),
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      let errorData: { message?: string; code?: string; detail?: string } = { message: 'Request failed' };
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }

      const error: ApiError = new Error(errorData.message || errorData.detail || `HTTP ${response.status}`);
      error.code = errorData.code;
      error.status = response.status;
      throw error;
    }

    // 处理空响应
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  }

  /**
   * GET 请求
   */
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST 请求
   */
  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT 请求
   */
  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH 请求
   */
  patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 导出单例实例
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
export { ApiClient, API_BASE_URL };
export type { ApiError };
