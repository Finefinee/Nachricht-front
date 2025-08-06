import React, { useState, useEffect } from 'react';
import { LogOut, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import type { User as UserType } from '../types';

const ChatSidebar: React.FC = () => {
  const { state: authState, logout } = useAuth();
  const { state: chatState, setActiveRoom, createRoom, loadRooms, loadMessages } = useChat();
  const [showNewChatInput, setShowNewChatInput] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 컴포넌트 마운트시 모든 채팅방의 메시지를 미리 로드
  useEffect(() => {
    if (chatState.rooms.length > 0) {
      console.log('📨 사이드바에서 모든 채팅방 메시지 미리 로드');
      chatState.rooms.forEach(room => {
        loadMessages(room.id);
      });
    }
  }, [chatState.rooms, loadMessages]);

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
          // 채팅방 목록 정렬 (최신 메시지 기준)
          [...chatState.rooms]
            // 유효한 채팅방만 필터링
            .filter(room => room && typeof room.id === 'number')
            // 정렬 함수
            .sort((roomA, roomB) => {
              const messagesA = chatState.messages[roomA.id] || [];
              const messagesB = chatState.messages[roomB.id] || [];
              
              // 둘 다 메시지가 없으면 ID로 정렬 (오래된 채팅방이 위로)
              if (messagesA.length === 0 && messagesB.length === 0) {
                return roomA.id - roomB.id;
              }
              
              // A에 메시지가 없으면 B가 위로
              if (messagesA.length === 0) return 1;
              
              // B에 메시지가 없으면 A가 위로
              if (messagesB.length === 0) return -1;
              
              // 둘 다 메시지가 있으면 마지막 메시지 시간으로 정렬
              const lastMessageA = messagesA[messagesA.length - 1];
              const lastMessageB = messagesB[messagesB.length - 1];
              
              // 시간 객체로 변환해서 비교
              const timeA = new Date(lastMessageA.sentAt).getTime();
              const timeB = new Date(lastMessageB.sentAt).getTime();
              
              // 최신 메시지가 위로 (내림차순)
              return timeB - timeA;
            })
            .map((room) => {
              // 디버깅 로그
              console.log('📍 채팅방 렌더링 중:', room.id, '참여자:', room.participants, 
                        '마지막 메시지:', chatState.messages[room.id]?.length > 0 ? 
                                      new Date(chatState.messages[room.id][chatState.messages[room.id].length - 1].sentAt).toLocaleString() : 'none');
              const otherParticipant = getOtherParticipant(room.participants);
              const isActive = chatState.activeRoom?.id === room.id;
              
              return (
                <div
                  key={room.id}
                  onClick={() => {
                    // 이미 선택된 채팅방은 다시 클릭해도 아무 동작 없게
                    if (!isActive) {
                      setActiveRoom(room);
                    }
                  }}
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
                    <div className="chat-preview">
                      {chatState.messages[room.id]?.length > 0 
                        ? chatState.messages[room.id][chatState.messages[room.id].length - 1].content
                        : '새로운 대화를 시작하세요'}
                    </div>
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
