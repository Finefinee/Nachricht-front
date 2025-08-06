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
        when: message.when,
        currentMessagesCount: currentMessages.length 
      });
      
      // 메시지 시간 처리 확인
      try {
        const messageDate = new Date(message.when);
        console.log(`⏰ 메시지 시간 파싱: ${messageDate.toLocaleString('ko-KR')} (현지 시간)`);
      } catch (error) {
        console.warn('⚠️ 메시지 시간 파싱 실패:', error);
      }
      
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
        
        // 새 메시지가 있는 채팅방이 목록 최상단으로 오도록 정렬
        const updatedMessages = {
          ...state.messages,
          [roomId]: newMessages,
        };
        
        // 기존 state의 rooms 배열을 그대로 사용 (순서 변경하지 않음)
        // 채팅방 정렬은 sidebar 컴포넌트에서 직접 수행하도록 함
        // 이렇게 하면 불필요한 리렌더링이 줄어들고, UI 구성요소에서 정렬 로직을 집중 관리할 수 있음
        
        console.log('� 메시지 추가됨 - 채팅방:', roomId, '시간:', new Date(message.when).toLocaleString());
        
        return {
          ...state,
          messages: updatedMessages,
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

  // 채팅방 정렬은 이제 렌더링 시 ChatSidebar 컴포넌트에서 수행

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
      
      // 정렬은 하지 않고 원래 순서대로 저장
      // 실제 정렬은 ChatSidebar 컴포넌트에서 수행
      
      dispatch({ type: 'SET_ROOMS', payload: rooms });
      
      console.log('🏆 채팅방 로드 완료, 최신순으로 정렬될 것입니다.');
      
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

    // 현재 날짜와 시간을 로컬 타임존으로 생성
    const now = new Date();
    console.log(`⏰ 메시지 작성 시간: ${now.toLocaleString('ko-KR')} (현지 시간)`);
    
    const message: SendMessageRequest = {
      senderUsername: authState.user.username,
      roomId,
      content: content.trim(),
      when: now.toISOString(), // ISO 형식 시간 사용 (UTC 기반)
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
  
  // 최신 메시지가 있는 채팅방 선택 함수 (개선된 버전)
  const selectFirstRoom = useCallback(async (rooms: MessengerRoom[]) => {
    // 이미 선택된 채팅방이 있거나 채팅방이 없으면 무시
    if (!rooms.length || state.activeRoom) {
      return;
    }
    
    console.log(`🔍 최신 채팅방 선택 시도 중... 현재 ${rooms.length}개 채팅방 가용`);
    
    try {
      // 1. 로컬 스토리지에서 이전에 저장된 활성 채팅방 ID가 있는지 확인
      const savedRoomId = localStorage.getItem('activeRoomId');
      if (savedRoomId) {
        const roomId = parseInt(savedRoomId, 10);
        const savedRoom = rooms.find(r => r.id === roomId);
        if (savedRoom) {
          console.log(`💾 로컬 스토리지에 저장된 채팅방 발견: #${roomId}, 선택합니다`);
          dispatch({ type: 'SET_ACTIVE_ROOM', payload: savedRoom });
          loadMessages(savedRoom.id);
          return;
        }
      }
      
      // 2. 모든 채팅방의 메시지를 가져오기 위한 병렬 로드 (최적화)
      // 메시지 로딩이 이전에 안 되어있을 수 있으므로 최대 3개 채팅방만 병렬로 로드
      const loadMessagesPromises = rooms.slice(0, 3).map(room => {
        // 이미 메시지가 로드되어 있으면 스킵
        if (state.messages[room.id] && state.messages[room.id].length > 0) {
          return Promise.resolve(state.messages[room.id]);
        }
        // 아니면 메시지 로드
        return loadMessages(room.id).then(() => state.messages[room.id] || []);
      });
      
      // 병렬로 메시지 로드 실행
      await Promise.all(loadMessagesPromises);
      console.log('� 주요 채팅방 메시지 로드 완료');
      
      // 3. 메시지가 있는 채팅방 찾기
      const roomsWithMessages = rooms.filter(room => 
        state.messages[room.id] && state.messages[room.id].length > 0
      );
      
      let roomToSelect;
      
      if (roomsWithMessages.length > 0) {
        // 메시지 시간순으로 정렬
        roomsWithMessages.sort((a, b) => {
          const messagesA = state.messages[a.id] || [];
          const messagesB = state.messages[b.id] || [];
          
          if (messagesA.length === 0) return 1;
          if (messagesB.length === 0) return -1;
          
          const timeA = new Date(messagesA[messagesA.length - 1].sentAt).getTime();
          const timeB = new Date(messagesB[messagesB.length - 1].sentAt).getTime();
          
          return timeB - timeA; // 최신순 정렬
        });
        
        // 가장 최신 메시지가 있는 채팅방 선택
        roomToSelect = roomsWithMessages[0];
        console.log(`🔄 최신 메시지 기준 채팅방 #${roomToSelect.id} 선택됨`);
      } else {
        // 메시지가 없으면 첫 번째 채팅방 선택
        roomToSelect = rooms[0];
        console.log(`🔄 메시지가 없어 첫 번째 채팅방 #${roomToSelect.id} 선택됨`);
      }
      
      // 선택된 채팅방 활성화
      dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomToSelect });
      loadMessages(roomToSelect.id);
      
      // 로컬 스토리지에 활성 채팅방 ID 저장
      localStorage.setItem('activeRoomId', roomToSelect.id.toString());
      
      // 보류 중인 메시지 처리
      processPendingMessages();
    } catch (error) {
      console.error('❌ 최신 채팅방 선택 중 오류 발생:', error);
      // 오류 발생 시 첫 번째 채팅방 선택
      if (rooms.length > 0) {
        dispatch({ type: 'SET_ACTIVE_ROOM', payload: rooms[0] });
        loadMessages(rooms[0].id);
      }
    }
  }, [state.activeRoom, state.messages, loadMessages, processPendingMessages]);

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
      
      // 채팅방 로드 후 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 모든 로드 작업 완료 후 첫 번째 채팅방 선택
      await selectFirstRoom(rooms);
      
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
