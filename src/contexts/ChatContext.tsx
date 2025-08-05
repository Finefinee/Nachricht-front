import React, { createContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { ChatState, MessengerRoom, MessageEntity, SendMessageRequest } from '../types';
import { roomAPI, messageAPI } from '../services/api';
import webSocketService from '../services/websocket';
import { useAuth } from '../hooks/useAuth';

// ChatContext 액션 타입
interface ChatAction {
  type: 
    | 'SET_LOADING'
    | 'SET_ERROR'
    | 'SET_ROOMS'
    | 'SET_MESSAGES'
    | 'ADD_MESSAGE'
    | 'SET_ACTIVE_ROOM'
    | 'CLEAR_ERROR';
  payload?: unknown;
}

// 초기 상태
const initialState: ChatState = {
  rooms: [],
  messages: {},
  activeRoom: null,
  isLoading: false,
  error: null,
};

// 리듀서 함수
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload as boolean,
      };
    }
    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload as string,
        isLoading: false,
      };
    }
    case 'SET_ROOMS': {
      return {
        ...state,
        rooms: action.payload as MessengerRoom[],
        isLoading: false,
      };
    }
    case 'SET_MESSAGES': {
      const { roomId, messages } = action.payload as { roomId: number; messages: MessageEntity[] };
      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: messages,
        },
        isLoading: false,
      };
    }
    case 'ADD_MESSAGE': {
      const message = action.payload as SendMessageRequest;
      const roomId = message.roomId;
      const currentMessages = state.messages[roomId] || [];
      
      console.log('💬 메시지 추가 시도:', { 
        roomId, 
        content: message.content,
        sender: message.senderUsername,
        currentMessagesCount: currentMessages.length 
      });
      
      // 중복 메시지 방지
      const isDuplicate = currentMessages.some(
        (msg) => msg.content === message.content && 
                 msg.sender.username === message.senderUsername &&
                 Math.abs(new Date(msg.sentAt).getTime() - new Date(message.when).getTime()) < 1000
      );
      
      if (!isDuplicate) {
        console.log('✅ 새 메시지 추가');
        // SendMessageRequest를 MessageEntity 형태로 변환
        const messageEntity: MessageEntity = {
          id: Date.now() + Math.floor(Math.random() * 1000), // 더 고유한 ID 생성
          content: message.content,
          sentAt: message.when,
          sender: { username: message.senderUsername, role: 'USER' },
          room: state.rooms.find(r => r.id === roomId) || { id: roomId, participants: [] },
        };
        
        // 메시지 저장 후 로컬 스토리지에도 저장
        const newMessages = [...currentMessages, messageEntity];
        
        try {
          // 로컬 스토리지에 메시지 저장 (캐싱)
          localStorage.setItem(`messages_${roomId}`, JSON.stringify(newMessages));
          console.log(`💾 채팅방 #${roomId} 메시지 ${newMessages.length}개 로컬 스토리지에 저장 완료`);
        } catch (error) {
          console.warn('⚠️ 로컬 스토리지 저장 실패:', error);
        }
        
        return {
          ...state,
          messages: {
            ...state.messages,
            [roomId]: newMessages,
          },
        };
      } else {
        console.log('⚠️ 중복 메시지 무시됨');
      }
      return state;
    }
    case 'SET_ACTIVE_ROOM': {
      return {
        ...state,
        activeRoom: action.payload as MessengerRoom,
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

// Context 타입 정의
interface ChatContextType {
  state: ChatState;
  loadRooms: () => Promise<MessengerRoom[]>;
  loadMessages: (roomId: number) => Promise<void>;
  sendMessage: (roomId: number, content: string) => void;
  setActiveRoom: (room: MessengerRoom) => void;
  createRoom: (participantUsername: string) => Promise<MessengerRoom | null>;
  clearError: () => void;
  isInitializing: boolean;
}

// Context 생성
export const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider 컴포넌트
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { state: authState } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initAttempts, setInitAttempts] = useState(0);
  const MAX_INIT_ATTEMPTS = 3;
  
  // WebSocket 메시지 핸들러 설정
  useEffect(() => {
    const unsubscribeMessage = webSocketService.onMessage((message: SendMessageRequest) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    });

    return () => {
      unsubscribeMessage();
    };
  }, []);

  // 채팅방 로드 함수
  const loadRooms = useCallback(async (): Promise<MessengerRoom[]> => {
    if (!authState.user) {
      console.warn('🚫 사용자 정보가 없어 채팅방을 로드할 수 없습니다.');
      return [];
    }
    
    console.log(`📂 채팅방 목록 로드 시작 - 사용자: ${authState.user.username}`);
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await roomAPI.getUserRooms(authState.user.username);
      console.log('📦 백엔드 응답 원본 데이터:', JSON.stringify(response, null, 2));
      
      // 응답 유효성 검사 및 데이터 정제
      if (!Array.isArray(response)) {
        console.warn('⚠️ 백엔드 응답이 배열이 아닙니다:', typeof response);
        dispatch({ type: 'SET_ROOMS', payload: [] });
        return [];
      }
      
      // 데이터 유효성 검사 및 정제
      const rooms = response.map(room => {
        if (!room.participants || !Array.isArray(room.participants)) {
          room.participants = [];
        }
        return room;
      });
      
      console.log(`✅ 채팅방 ${rooms.length}개 로드 성공:`, rooms);
      dispatch({ type: 'SET_ROOMS', payload: rooms });
      return rooms;
    } catch (error) {
      console.error('❌ 채팅방 목록 로드 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '채팅방 목록을 불러오는데 실패했습니다.' });
      return [];
    }
  }, [authState.user]);

  // 채팅방 메시지 로드 함수
  const loadMessages = useCallback(async (roomId: number) => {
    if (!roomId) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // 먼저 로컬 스토리지에서 메시지 확인
    try {
      const cachedMessagesJson = localStorage.getItem(`messages_${roomId}`);
      if (cachedMessagesJson) {
        const cachedMessages = JSON.parse(cachedMessagesJson) as MessageEntity[];
        console.log(`📂 채팅방 #${roomId} 캐시된 메시지 ${cachedMessages.length}개 로드`);
        
        // 캐시된 메시지 먼저 표시
        if (cachedMessages.length > 0) {
          dispatch({ type: 'SET_MESSAGES', payload: { roomId, messages: cachedMessages } });
        }
      }
    } catch (cacheError) {
      console.warn('⚠️ 로컬 스토리지에서 메시지 로드 실패:', cacheError);
    }
    
    // 백엔드에서 최신 메시지 가져오기 시도
    try {
      console.log(`📩 채팅방 #${roomId} 메시지 서버에서 로드 시작`);
      const messages = await messageAPI.getMessages(roomId);
      console.log(`✅ 채팅방 #${roomId} 메시지 ${messages.length}개 서버에서 로드 성공`);
      
      // 로컬 스토리지에 저장
      try {
        localStorage.setItem(`messages_${roomId}`, JSON.stringify(messages));
        console.log(`💾 채팅방 #${roomId} 메시지 ${messages.length}개 로컬 스토리지에 저장`);
      } catch (storageError) {
        console.warn('⚠️ 로컬 스토리지 저장 실패:', storageError);
      }
      
      dispatch({ type: 'SET_MESSAGES', payload: { roomId, messages } });
    } catch (error) {
      console.error(`❌ 채팅방 #${roomId} 메시지 서버 로드 실패:`, error);
      dispatch({ type: 'SET_ERROR', payload: '서버에서 메시지를 불러오는데 실패했습니다.' });
    }
  }, []);

  // 메시지 전송 함수
  const sendMessage = useCallback((roomId: number, content: string) => {
    if (!authState.user || !content.trim()) {
      console.log('❌ 메시지 전송 불가: 사용자 없음 또는 내용 없음', { user: authState.user?.username, contentLength: content?.length });
      return;
    }

    const message: SendMessageRequest = {
      senderUsername: authState.user.username,
      roomId,
      content: content.trim(),
      when: new Date().toISOString(), // ISO 형식 시간 사용
    };

    // 디버그 로그 추가
    console.log('📤 메시지 전송 시도:', { 
      roomId, 
      content: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
      user: authState.user.username
    });

    try {
      // WebSocket으로 메시지 전송
      webSocketService.sendMessage(message);
      console.log('✅ 메시지 전송 성공');
      
      // 즉시 UI에 반영 (낙관적 업데이트)
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
    }
  }, [authState.user]);

  // 활성 채팅방 설정 함수
  const setActiveRoom = useCallback((room: MessengerRoom) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: room });
    loadMessages(room.id);
    
    // 활성 채팅방을 로컬 스토리지에 저장 (페이지 새로고침 시 유지)
    try {
      localStorage.setItem('activeRoomId', room.id.toString());
      console.log('💾 활성 채팅방 ID 저장:', room.id);
    } catch (error) {
      console.warn('⚠️ 활성 채팅방 저장 실패:', error);
    }
  }, [loadMessages]);

  // 새 채팅방 생성 함수
  const createRoom = useCallback(async (participantUsername: string): Promise<MessengerRoom | null> => {
    if (!authState.user) return null;

    try {
      const room = await roomAPI.createRoom([authState.user.username, participantUsername]);
      
      // 새 채팅방을 목록에 추가
      dispatch({ type: 'SET_ROOMS', payload: [...state.rooms, room] });
      return room;
    } catch (error) {
      console.error('❌ 채팅방 생성 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: '채팅방 생성에 실패했습니다.' });
      return null;
    }
  }, [authState.user, state.rooms]);

  // 에러 초기화 함수
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);
  
  // 보류 중인 메시지 처리
  const processPendingMessages = useCallback(() => {
    try {
      const pendingMessagesJson = localStorage.getItem('pending_messages');
      if (!pendingMessagesJson) return;
      
      const pendingMessages = JSON.parse(pendingMessagesJson) as SendMessageRequest[];
      if (pendingMessages.length === 0) return;
      
      console.log(`⏳ ${pendingMessages.length}개의 보류 중인 메시지 처리 중...`);
      
      // 모든 메시지를 상태에 추가
      pendingMessages.forEach(message => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      });
      
      // 보류 중인 메시지 목록 비우기
      localStorage.setItem('pending_messages', '[]');
      console.log('✅ 보류 중인 메시지 처리 완료');
    } catch (error) {
      console.error('❌ 보류 중인 메시지 처리 실패:', error);
    }
  }, []);
  
  // 첫 번째 채팅방 선택 함수 
  const selectFirstRoom = useCallback((rooms: MessengerRoom[]) => {
    if (rooms.length > 0 && !state.activeRoom) {
      console.log('🔄 첫 번째 채팅방 자동 선택:', rooms[0].id);
      dispatch({ type: 'SET_ACTIVE_ROOM', payload: rooms[0] });
      loadMessages(rooms[0].id);
      
      // 보류 중인 메시지 처리
      processPendingMessages();
    }
  }, [state.activeRoom, loadMessages, processPendingMessages]);

  // 채팅 초기화 시도 함수
  const attemptInitialization = useCallback(async () => {
    if (!authState.isAuthenticated || !authState.user) {
      console.log('👤 인증된 사용자가 없어 채팅 초기화를 건너뜁니다.');
      setIsInitializing(false);
      return;
    }

    setInitAttempts(prev => prev + 1);
    console.log(`🔄 채팅 초기화 시도 ${initAttempts + 1}/${MAX_INIT_ATTEMPTS}`);

    // 웹소켓 연결 시도 (실패해도 계속 진행)
    try {
      await webSocketService.connect(authState.user.username);
      console.log('✅ 웹소켓 연결 성공');
    } catch (error) {
      console.warn('⚠️ 웹소켓 연결 실패:', error);
    }

    try {
      // 채팅방 로드
      const rooms = await loadRooms();
      // 첫 번째 채팅방 선택
      selectFirstRoom(rooms);
      console.log('✅ 채팅 초기화 완료');
      setIsInitializing(false);
    } catch (error) {
      console.error('❌ 채팅 초기화 중 오류 발생:', error);
      
      // 최대 시도 횟수 도달 시 초기화 상태 종료
      if (initAttempts + 1 >= MAX_INIT_ATTEMPTS) {
        console.error(`⛔ 최대 시도 횟수(${MAX_INIT_ATTEMPTS}회) 도달. 초기화 종료.`);
        setIsInitializing(false);
        dispatch({ type: 'SET_ERROR', payload: '채팅 데이터 로드에 실패했습니다. 페이지를 새로고침해 주세요.' });
      }
    }
  }, [authState.isAuthenticated, authState.user, initAttempts, loadRooms, selectFirstRoom]);

  // 인증 상태 변경 시 초기화 실행
  useEffect(() => {
    if (isInitializing && initAttempts < MAX_INIT_ATTEMPTS) {
      console.log('🚀 채팅 컨텍스트 초기화 시작...');
      attemptInitialization();
    }
  }, [isInitializing, initAttempts, attemptInitialization]);
  
  // 최초 렌더링 시 로컬 스토리지에서 활성 채팅방과 보류 메시지 처리
  useEffect(() => {
    if (authState.isAuthenticated && !isInitializing) {
      console.log('📋 로컬 스토리지에서 채팅 데이터 복원 시도');
      
      // 보류 중인 메시지 처리
      processPendingMessages();
      
      // 저장된 활성 채팅방 복원
      try {
        const savedRoomId = localStorage.getItem('activeRoomId');
        if (savedRoomId && state.rooms.length > 0) {
          const roomId = parseInt(savedRoomId, 10);
          const room = state.rooms.find(r => r.id === roomId);
          if (room && !state.activeRoom) {
            console.log('💾 저장된 활성 채팅방 복원:', roomId);
            dispatch({ type: 'SET_ACTIVE_ROOM', payload: room });
            loadMessages(room.id);
          }
        }
      } catch (error) {
        console.warn('⚠️ 활성 채팅방 복원 실패:', error);
      }
    }
  }, [authState.isAuthenticated, isInitializing, state.rooms, state.activeRoom, loadMessages, processPendingMessages]);

  // 채팅 초기화 재시도 (실패 시)
  useEffect(() => {
    // 초기화에 실패했고, 최대 시도 횟수에 도달하지 않았다면 재시도
    if (initAttempts > 0 && initAttempts < MAX_INIT_ATTEMPTS && isInitializing) {
      const retryTimeout = setTimeout(() => {
        attemptInitialization();
      }, 2000); // 2초 후 재시도
      
      return () => clearTimeout(retryTimeout);
    }
  }, [initAttempts, attemptInitialization, isInitializing]);

  return (
    <ChatContext.Provider value={{ 
      state, 
      loadRooms, 
      loadMessages, 
      sendMessage, 
      setActiveRoom, 
      createRoom,
      clearError,
      isInitializing
    }}>
      {children}
    </ChatContext.Provider>
  );
};
