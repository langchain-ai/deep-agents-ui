"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/api/client";
import type { User, UserSettings, LoginResponse, ModelOption, ToolOption } from "@/app/types/types";

// ============ 类型定义 ============
interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  /** 登录 */
  login: (email: string, password: string) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 更新用户设置 */
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  /** 获取可用模型列表 */
  getAvailableModels: () => Promise<ModelOption[]>;
  /** 获取可用工具列表 */
  getAvailableTools: () => Promise<ToolOption[]>;
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>;
}

// ============ 常量 ============
const TOKEN_KEY = "deep_agents_token";
const USER_KEY = "deep_agents_user";
const SETTINGS_KEY = "deep_agents_settings";

// ============ Context ============
const AuthContext = createContext<AuthContextValue | null>(null);

// ============ Provider ============
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    settings: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 从本地存储恢复状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);
        const settingsJson = localStorage.getItem(SETTINGS_KEY);

        if (token) {
          apiClient.setToken(token);

          // 尝试从本地存储恢复用户信息
          let user: User | null = null;
          let settings: UserSettings | null = null;

          if (userJson) {
            try {
              user = JSON.parse(userJson);
            } catch {
              // 忽略解析错误
            }
          }

          if (settingsJson) {
            try {
              settings = JSON.parse(settingsJson);
            } catch {
              // 忽略解析错误
            }
          }

          // 验证 token 并获取最新用户信息
          try {
            const response = await apiClient.get<{ user: User; settings: UserSettings }>(
              "/api/auth/me"
            );
            user = response.user;
            settings = response.settings;

            // 更新本地存储
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          } catch (error) {
            // Token 无效，清除本地存储
            console.warn("Token validation failed:", error);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(SETTINGS_KEY);
            apiClient.setToken(null);

            setState({
              user: null,
              settings: null,
              token: null,
              isLoading: false,
              isAuthenticated: false,
            });
            return;
          }

          setState({
            user,
            settings,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await apiClient.post<LoginResponse>("/api/auth/login", {
        email,
        password,
      });

      const { token, user, settings } = response;

      // 保存到本地存储
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // 设置 API 客户端 token
      apiClient.setToken(token);

      setState({
        user,
        settings,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      // 尝试调用后端登出接口
      await apiClient.post("/api/auth/logout").catch(() => {
        // 忽略登出 API 错误
      });
    } finally {
      // 清除本地存储
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SETTINGS_KEY);

      // 清除 API 客户端 token
      apiClient.setToken(null);

      setState({
        user: null,
        settings: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // 更新设置
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    try {
      const updated = await apiClient.put<UserSettings>("/api/settings", newSettings);

      // 更新本地存储
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

      setState((prev) => ({ ...prev, settings: updated }));
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  }, []);

  // 获取可用模型
  const getAvailableModels = useCallback(async (): Promise<ModelOption[]> => {
    try {
      const response = await apiClient.get<{ models: ModelOption[] }>("/api/models");
      return response.models;
    } catch (error) {
      console.error("Failed to get models:", error);
      return [];
    }
  }, []);

  // 获取可用工具
  const getAvailableTools = useCallback(async (): Promise<ToolOption[]> => {
    try {
      const response = await apiClient.get<{ tools: ToolOption[] }>("/api/tools");
      return response.tools;
    } catch (error) {
      console.error("Failed to get tools:", error);
      return [];
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    if (!state.token) return;

    try {
      const response = await apiClient.get<{ user: User; settings: UserSettings }>(
        "/api/auth/me"
      );

      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(response.settings));

      setState((prev) => ({
        ...prev,
        user: response.user,
        settings: response.settings,
      }));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [state.token]);

  // 构建 context value
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      updateSettings,
      getAvailableModels,
      getAvailableTools,
      refreshUser,
    }),
    [state, login, logout, updateSettings, getAvailableModels, getAvailableTools, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============ Hook ============
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// ============ 辅助 Hook ============
/**
 * 获取当前用户
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * 获取用户设置
 */
export function useUserSettings(): UserSettings | null {
  const { settings } = useAuth();
  return settings;
}

/**
 * 检查是否已认证
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

