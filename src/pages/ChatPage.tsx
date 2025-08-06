import React, { useState, useEffect, useCallback } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import MobileNav from '../components/MobileNav';
import { useChat } from '../hooks/useChat';

const ChatPage: React.FC = () => {
  const { state, isInitializing, setActiveRoom, loadMessages } = useChat();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // 최신 메시지가 있는 채팅방 선택 (간소화된 버전)
  const selectLatestMessageRoom = useCallback(() => {
    if (state.activeRoom || state.rooms.length === 0) {
      return; // 이미 활성화된 채팅방이 있거나 채팅방이 없으면 무시
    }
    
    console.log('🔄 최신 채팅방 선택 시도 - 현재 채팅방 수:', state.rooms.length, 
               '메시지 데이터:', Object.keys(state.messages).length);
    
    // 채팅방을 정렬하는 함수 (ChatSidebar와 동일한 로직)
    const sortedRooms = [...state.rooms].sort((a, b) => {
      const messagesA = state.messages[a.id] || [];
      const messagesB = state.messages[b.id] || [];
      
      if (messagesA.length === 0 && messagesB.length === 0) return a.id - b.id;
      if (messagesA.length === 0) return 1;
      if (messagesB.length === 0) return -1;
      
      const timeA = new Date(messagesA[messagesA.length - 1].sentAt).getTime();
      const timeB = new Date(messagesB[messagesB.length - 1].sentAt).getTime();
      
      return timeB - timeA;
    });
    
    // 첫 번째 채팅방 (최신 메시지가 있는 채팅방) 선택
    if (sortedRooms.length > 0) {
      const roomToSelect = sortedRooms[0];
      console.log('🔄 ChatPage에서 채팅방 선택:', roomToSelect.id, 
                 '메시지 수:', (state.messages[roomToSelect.id] || []).length);
      
      setActiveRoom(roomToSelect);
      loadMessages(roomToSelect.id);
    }
  }, [state.activeRoom, state.rooms, state.messages, setActiveRoom, loadMessages]);
  
  // 모바일 환경 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      } else {
        // 모바일에서는 채팅방이 선택되었을 때 사이드바 숨김
        setShowSidebar(!state.activeRoom);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [state.activeRoom]);

  // 사이드바 토글 함수
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // 메시지가 로드된 후 최신 채팅방 선택 (초기 로드)
  useEffect(() => {
    // 초기화가 완료되고, 활성 채팅방이 없는 경우
    if (!isInitializing && !state.activeRoom && state.rooms.length > 0) {
      console.log('🔍 ChatPage: 채팅방 선택 필요, 최신 채팅방 선택 로직 실행');
      
      // 약간 지연 후 선택 (비동기 로딩 완료 대기)
      const timer = setTimeout(() => {
        selectLatestMessageRoom();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isInitializing, state.activeRoom, state.rooms.length, state.messages, selectLatestMessageRoom]);
  
  // 메시지 상태 변경시 최신 채팅방 검토
  useEffect(() => {
    // 메시지 객체의 키 수
    const messageKeysCount = Object.keys(state.messages).length;
    
    if (!isInitializing && !state.activeRoom && messageKeysCount > 0) {
      console.log('🔄 ChatPage: 메시지가 로드되었으나 선택된 채팅방 없음, 최신 채팅방 선택');
      selectLatestMessageRoom();
    }
  }, [isInitializing, state.activeRoom, state.messages, selectLatestMessageRoom]);

  // 활성 뷰 상태 계산
  const activeView = showSidebar ? 'sidebar' : 'chat';

  // 앱 초기화 중일 때 로딩 화면 표시
  if (isInitializing) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>채팅 데이터를 로드하고 있습니다</h2>
        <p>잠시만 기다려 주세요...</p>
      </div>
    );
  }
  
  // 채팅방 목록 로딩 중 표시
  if (state.isLoading && state.rooms.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>채팅방 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      {/* 사이드바 */}
      <div className={`chat-sidebar ${isMobile ? 'mobile' : ''} ${showSidebar ? 'show' : 'hide'}`}>
        <ChatSidebar />
      </div>
      
      {/* 채팅 창 */}
      <div className={`chat-window ${isMobile ? 'mobile' : ''} ${!showSidebar || !isMobile ? 'show' : 'hide'}`}>
        {state.activeRoom ? (
          <ChatWindow />
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h2 className="chat-empty-text">채팅방을 선택하세요</h2>
            <p className="chat-empty-subtext">왼쪽에서 채팅방을 선택하거나 새로운 채팅을 시작하세요.</p>
            {state.error && (
              <div className="error-message">
                {state.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모바일 네비게이션 */}
      {isMobile && (
        <MobileNav 
          showSidebar={showSidebar} 
          toggleSidebar={toggleSidebar} 
          activeView={activeView as 'chat' | 'sidebar'} 
        />
      )}
    </div>
  );
};

export default ChatPage;
