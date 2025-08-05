import React from 'react';
import { Menu, MessageSquare } from 'lucide-react';

interface MobileNavProps {
  showSidebar: boolean;
  toggleSidebar: () => void;
  activeView: 'chat' | 'sidebar';
}

const MobileNav: React.FC<MobileNavProps> = ({ showSidebar, toggleSidebar }) => {
  return (
    <div className="mobile-nav">
      <button 
        onClick={toggleSidebar}
        onTouchStart={(e) => {
          e.stopPropagation(); // 이벤트 전파 중지
          console.log('모바일 네비게이션 버튼 터치 시작');
        }}
        onTouchEnd={(e) => {
          e.preventDefault(); // 기본 동작 방지
          e.stopPropagation(); // 이벤트 전파 중지
          console.log('모바일 네비게이션 버튼 터치 종료');
          toggleSidebar();
        }} 
        className="mobile-nav-button"
        aria-label={showSidebar ? "채팅 보기" : "메뉴 열기"}
      >
        {showSidebar ? <MessageSquare size={24} /> : <Menu size={24} />}
      </button>
    </div>
  );
};

export default MobileNav;
