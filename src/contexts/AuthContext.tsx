import React, { createContext, useReducer, useEffect } from 'react';
import type { AuthState, LoginRequest, RegisterRequest, User } from '../types';
import { authAPI } from '../services/api';
import webSocketService from '../services/websocket';

interface AuthAction {
  type: 
    | 'LOGIN_START'
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'SET_USER'
    | 'CLEAR_ERROR';
  payload?: unknown;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  accessToken: null,
  refreshToken: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START': {
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    }
    case 'LOGIN_SUCCESS': {
      const { user, accessToken, refreshToken } = action.payload as {
        user: User;
        accessToken: string;
        refreshToken: string;
      };
      return {
        ...state,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        accessToken,
        refreshToken,
      };
    }
    case 'LOGIN_FAILURE': {
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload as string,
        accessToken: null,
        refreshToken: null,
      };
    }
    case 'LOGOUT': {
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        accessToken: null,
        refreshToken: null,
      };
    }
    case 'SET_USER': {
      const { user, accessToken, refreshToken } = action.payload as {
        user: User;
        accessToken: string;
        refreshToken: string;
      };
      return {
        ...state,
        user,
        isAuthenticated: true,
        accessToken,
        refreshToken,
      };
    }
    case 'CLEAR_ERROR': {
      return {
        ...state,
        error: null,
      };
    }
    default:
      return state;
  }
};

interface AuthContextType {
  state: AuthState;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // 페이지 새로고침 시 토큰 확인
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');

    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        dispatch({ 
          type: 'SET_USER', 
          payload: { user, accessToken, refreshToken } 
        });
        webSocketService.connect(user.username);
      } catch {
        // localStorage 데이터가 손상된 경우
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (request: LoginRequest) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.login(request);
      
      // 간단한 사용자 객체 생성 (실제로는 백엔드에서 받아야 함)
      const user: User = {
        username: request.username,
        role: 'USER',
      };

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          user, 
          accessToken: response.accessToken, 
          refreshToken: response.refreshToken 
        } 
      });

      webSocketService.connect(user.username);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  };

  const register = async (request: RegisterRequest) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      await authAPI.register(request);
      // 회원가입 후 자동 로그인
      await login({ username: request.username, password: request.password });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '회원가입에 실패했습니다.';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    webSocketService.disconnect();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
