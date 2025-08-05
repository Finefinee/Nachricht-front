import React, { useState, useEffect } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import MobileNav from '../components/MobileNav';
import { useChat } from '../hooks/useChat';

const ChatPage: React.FC = () => {
  const { state, isInitializing } = useChat();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
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
