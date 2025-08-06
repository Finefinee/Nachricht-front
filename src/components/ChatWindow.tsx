import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';

const ChatWindow: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: chatState, sendMessage } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentRoom = chatState.activeRoom;
  const messages = useMemo(() => {
    return currentRoom ? chatState.messages[currentRoom.id] || [] : [];
  }, [currentRoom, chatState.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && currentRoom) {
      console.log('메시지 전송: ', newMessage);
      sendMessage(currentRoom.id, newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOtherParticipant = () => {
    if (!currentRoom) return null;
    return currentRoom.participants.find(p => p.username !== authState.user?.username);
  };

  const formatTime = (timeString: string) => {
    try {
      // timeString이 시간 형식인지 날짜 형식인지 확인
      if (timeString.includes(':') && !timeString.includes('T')) {
        return timeString; // 이미 시간 형식
      }
      
      // ISO 문자열을 Date 객체로 파싱
      const date = new Date(timeString);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('⚠️ 잘못된 날짜 형식:', timeString);
        return timeString;
      }
      
      // 로컬 시간 형식으로 변환
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('❌ 시간 형식 변환 오류:', error);
      return timeString;
    }
  };

  if (!currentRoom) {
    return null;
  }

  const otherParticipant = getOtherParticipant();

  return (
    <div className="h-full flex flex-col">
      {/* 채팅방 헤더 */}
      <div className="chat-header">
        <div className="chat-avatar">
          {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="chat-name" style={{ fontSize: '1.125rem' }}>
            {otherParticipant?.username || '알 수 없는 사용자'}
          </h2>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="message-container">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-text">아직 메시지가 없습니다.</p>
            <p className="chat-empty-subtext">첫 번째 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMyMessage = message.sender.username === authState.user?.username;
            
            return (
              <div
                key={`${message.id}-${index}`}
                className={`message ${isMyMessage ? 'message-sent' : 'message-received'}`}
              >
                <p style={{ margin: "0.1rem 0 0", lineHeight: "1.25", fontWeight: "400" }}>{message.content}</p>
                <p className="message-time">
                  {formatTime(message.sentAt)}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          className="message-input"
        />
        <div className="send-button-wrapper">
          <button
            onClick={() => {
              console.log('전송 버튼 클릭됨');
              handleSendMessage();
            }}
            onTouchStart={(e) => {
              e.stopPropagation(); // 이벤트 전파 중지
              console.log('전송 버튼 터치 시작');
            }}
            onTouchEnd={(e) => {
              e.preventDefault(); // 기본 동작 방지
              e.stopPropagation(); // 이벤트 전파 중지
              console.log('전송 버튼 터치 종료');
              if (newMessage.trim()) {
                handleSendMessage();
              }
            }}
            disabled={!newMessage.trim()}
            className="send-button"
            aria-label="메시지 보내기"
          >
            <Send size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
