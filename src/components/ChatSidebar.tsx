import React, { useState, useEffect } from 'react';
import { LogOut, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import type { User as UserType } from '../types';

const ChatSidebar: React.FC = () => {
  const { state: authState, logout } = useAuth();
  const { state: chatState, setActiveRoom, createRoom, loadRooms } = useChat();
  const [showNewChatInput, setShowNewChatInput] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 채팅방 새로고침 핸들러
  const handleRefreshRooms = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadRooms();
    } catch (error) {
      console.error('채팅방 새로고침 실패:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 새 채팅 생성 핸들러
  const handleNewChat = async () => {
    if (newChatUsername.trim()) {
      const room = await createRoom(newChatUsername.trim());
      if (room) {
        setActiveRoom(room);
        setShowNewChatInput(false);
        setNewChatUsername('');
      }
    }
  };

  // 채팅방의 다른 참여자를 안전하게 가져옴
  const getOtherParticipant = (participants: UserType[]) => {
    // 참여자 배열이 유효한지 확인
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      console.warn('❌ 유효하지 않은 participants 데이터:', participants);
      return { username: '알 수 없는 사용자' };
    }
    
    // 디버깅 정보 출력
    console.log('🔍 getOtherParticipant 확인:', { 
      roomParticipants: participants.map(p => p?.username || 'unknown'),
      currentUser: authState.user?.username || 'unknown'
    });
    
    // 다른 참여자를 찾거나 기본값 반환
    const otherUser = participants.find(p => p && p.username && p.username !== authState.user?.username);
    return otherUser || participants[0] || { username: '알 수 없는 사용자' };
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="sidebar-header">
        <div className="user-info">
          <div className="user-avatar">
            {authState.user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="username">
            {authState.user?.username || '게스트'}
          </span>
        </div>
        <div className="sidebar-actions">
          <button
            onClick={handleRefreshRooms}
            disabled={isRefreshing || chatState.isLoading}
            className={`sidebar-button ${isRefreshing ? 'animate-spin' : ''}`}
            title="채팅방 새로고침"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={logout}
            className="sidebar-button"
            title="로그아웃"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 새 채팅 버튼 */}
      <div className="new-chat-section">
        {!showNewChatInput ? (
          <button
            onClick={() => setShowNewChatInput(true)}
            className="new-chat-button"
          >
            <Plus size={18} />
            <span>새 채팅</span>
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="사용자명 입력"
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNewChat()}
              className="auth-input"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleNewChat}
                className="auth-button"
                style={{ backgroundColor: '#2563eb' }}
              >
                생성
              </button>
              <button
                onClick={() => {
                  setShowNewChatInput(false);
                  setNewChatUsername('');
                }}
                className="auth-button"
                style={{ backgroundColor: '#9ca3af' }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 채팅방 목록 */}
      <div className="chat-list">
        {chatState.isLoading ? (
          <div className="loading-container" style={{ height: '200px' }}>
            <div className="loading-spinner" style={{ width: '2rem', height: '2rem' }}></div>
            <p>채팅방을 불러오는 중...</p>
          </div>
        ) : !chatState.rooms || chatState.rooms.length === 0 ? (
          <div className="chat-empty" style={{ height: '200px' }}>
            <div className="chat-empty-icon">💬</div>
            <p>채팅방이 없습니다</p>
            <p className="chat-empty-subtext">새 채팅을 시작해보세요!</p>
          </div>
        ) : (
          chatState.rooms
            .filter(room => room && typeof room.id === 'number')
            .map((room) => {
              console.log('📍 채팅방 렌더링 중:', room.id, '참여자:', room.participants);
              const otherParticipant = getOtherParticipant(room.participants);
              const isActive = chatState.activeRoom?.id === room.id;
              
              return (
                <div
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                >
                  <div className="chat-avatar">
                    {otherParticipant?.username?.[0]?.toUpperCase() || 
                    (room.id ? room.id.toString()[0] : '?')}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">
                      {otherParticipant?.username || `채팅방 #${room.id}`}
                    </div>
                    {chatState.messages[room.id]?.length > 0 && (
                      <div className="chat-preview">
                        {chatState.messages[room.id][chatState.messages[room.id].length - 1].content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* 에러 표시 */}
      {chatState.error && (
        <div className="error-message" style={{ margin: '1rem' }}>
          {chatState.error}
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
