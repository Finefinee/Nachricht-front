import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import { useAuth } from './hooks/useAuth';
import './App.css';

// 보호된 라우트 컴포넌트 - 인증되지 않은 사용자 리디렉션
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  
  if (!state.isAuthenticated) {
    console.log('🔒 인증되지 않은 사용자 - 로그인 페이지로 리디렉션');
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// 이미 인증된 사용자는 채팅 페이지로 리디렉션
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  
  if (state.isAuthenticated) {
    console.log('🔓 이미 인증된 사용자 - 채팅 페이지로 리디렉션');
    return <Navigate to="/chat" />;
  }

  return <>{children}</>;
};

// AuthProvider를 사용하는 앱 래퍼
const AppWithAuth: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute>
          <ChatProvider>
            <ChatPage />
          </ChatProvider>
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWithAuth />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
