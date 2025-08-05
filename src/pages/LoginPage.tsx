import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { state, login, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login({ username, password });
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="auth-title">Nachricht에 로그인</h2>
        <p className="auth-subtitle">
          또는{' '}
          <Link to="/register">
            새 계정 만들기
          </Link>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              id="username"
              name="username"
              type="text"
              required
              className="auth-input"
              placeholder="사용자명"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              id="password"
              name="password"
              type="password"
              required
              className="auth-input"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {state.error && (
            <div className="auth-error">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={state.isLoading}
            className="auth-button"
          >
            {state.isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
