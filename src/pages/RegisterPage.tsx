import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { state, register, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (password !== confirmPassword) {
      return;
    }
    
    await register({ username, password });
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="auth-title">Nachricht 계정 만들기</h2>
        <p className="auth-subtitle">
          이미 계정이 있으신가요?{' '}
          <Link to="/login">
            로그인하기
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
          <div className="auth-input-group">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="auth-input"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {password !== confirmPassword && confirmPassword && (
            <div className="auth-error">
              비밀번호가 일치하지 않습니다.
            </div>
          )}

          {state.error && (
            <div className="auth-error">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={state.isLoading || password !== confirmPassword}
            className="auth-button"
          >
            {state.isLoading ? '계정 생성 중...' : '계정 만들기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
