import axios from 'axios';
import type { 
  LoginRequest, 
  JwtResponse,
  RegisterRequest,
  RefreshRequest,
  MessengerRoom,
  MessageEntity
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';  // 프록시 사용 시 빈 문자열

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  console.log(`🚀 API 요청 시작: ${config.method?.toUpperCase()} ${config.url}`, new Date().toISOString());
  
  let token = localStorage.getItem('accessToken');
  if (token) {
    // JWT 토큰 만료 확인 (간단한 체크)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.warn('⚠️ JWT 토큰이 만료되었습니다:', new Date(payload.exp * 1000));
        console.log('🔄 토큰 갱신 시도 시작');
        
        // 리프레시 토큰으로 자동 갱신 시도
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            // API 호출 시 요청 인터셉터가 다시 실행되어 무한 루프가 발생할 수 있으므로
            // axios 직접 사용 (api 인스턴스 대신)
            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh`, 
              { refreshToken }
            );
            
            const newAccessToken = response.data.accessToken;
            const newRefreshToken = response.data.refreshToken;
            
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            
            console.log('✅ 토큰 자동 갱신 성공');
            token = newAccessToken;  // 새 토큰으로 업데이트
          } catch (refreshError) {
            console.error('❌ 토큰 자동 갱신 실패:', refreshError);
            // 갱신 실패 시 로그인 페이지로 리다이렉트
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
      } else {
        const remainingSecs = payload.exp - now;
        console.log(`✅ JWT 토큰 유효: ${remainingSecs}초 남음 (${new Date(payload.exp * 1000)}까지)`);
      }
    } catch (parseError) {
      console.warn('⚠️ JWT 토큰 파싱 실패:', parseError);
    }
    
    // 최종적으로 토큰 설정 (갱신된 토큰이거나 원래 토큰)
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('⚠️ JWT 토큰이 없습니다 - 인증이 필요한 요청은 실패할 수 있습니다');
  }
  
  // 상세 요청 로깅
  console.log(`� 요청 세부정보:`, {
    url: config.url,
    method: config.method?.toUpperCase(),
    headers: {
      ...config.headers,
      Authorization: config.headers.Authorization ? '(JWT 토큰 설정됨)' : '(없음)'
    },
    params: config.params,
    hasData: !!config.data
  });
  
  if (config.data) {
    console.log('📤 요청 데이터:', JSON.stringify(config.data, null, 2));
  }
  
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config.headers['request-start-time'] || Date.now());
    console.log(`✅ 응답 성공: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    
    // 디버깅을 위한 응답 데이터 로깅 (개발 환경에서만)
    if (import.meta.env.DEV) {
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          console.log(`📥 응답 데이터: 배열 (${response.data.length}개 항목)`);
          if (response.data.length > 0) {
            console.log('📥 첫 번째 항목 샘플:', response.data[0]);
          }
        } else {
          console.log('📥 응답 데이터:', response.data);
        }
      }
    }
    
    return response;
  },
  async (error) => {
    console.error(`❌ 응답 실패: ${error.response?.status || 'NETWORK_ERROR'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error('오류 상세:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 인증 오류 감지 - 토큰 갱신 시도');
      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          console.log('🔄 토큰 갱신 요청 시작');
          const response = await authAPI.refresh({ refreshToken });
          console.log('✅ 토큰 갱신 성공');
          
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          
          // 새 토큰 유효성 확인
          try {
            const payload = JSON.parse(atob(response.accessToken.split('.')[1]));
            console.log('🔓 새 토큰 유효 기간:', new Date(payload.exp * 1000));
          } catch (parseError) {
            console.warn('⚠️ 새 토큰 파싱 실패:', parseError);
          }
            
          // Retry original request with new token
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
          console.log('🔄 원래 요청 재시도:', originalRequest.method?.toUpperCase(), originalRequest.url);
          return api(originalRequest);
        } catch (refreshError) {
          console.error('❌ 토큰 갱신 실패:', refreshError);
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          
          console.log('🚪 로그인 페이지로 리다이렉트');
          // 현재 경로 저장 (나중에 로그인 후 돌아오기 위해)
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/login';
        }
      } else {
        console.warn('⚠️ 리프레시 토큰 없음');
        // No refresh token, redirect to login
        localStorage.removeItem('accessToken');  // 혹시 남아있는 액세스 토큰도 제거
        
        console.log('🚪 로그인 페이지로 리다이렉트');
        // 현재 경로 저장
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login';
      }
    }
    
    // CORS 오류 특별 처리
    if (error.message && error.message.includes('Network Error')) {
      console.error('🌐 네트워크 오류 (CORS 문제 가능성):', error);
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (request: LoginRequest): Promise<JwtResponse> => {
    const response = await api.post('/auth/login', request);
    return response.data;
  },

  register: async (request: RegisterRequest): Promise<void> => {
    await api.post('/auth/signup', request);
  },

  refresh: async (request: RefreshRequest): Promise<JwtResponse> => {
    const response = await api.post('/auth/refresh', request);
    return response.data;
  },
};

export const roomAPI = {
  createRoom: async (participants: string[]) => {
    console.log('=== 채팅방 생성 API 호출 시작 ===');
    console.log('입력받은 participants:', participants);
    
    // 빈 배열이나 유효하지 않은 데이터 확인
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      throw new Error('참가자 목록이 비어있습니다.');
    }
    
    const filteredParticipants = participants.filter(p => p && p.trim().length > 0);
    
    // 기본 형식으로 전송 (백엔드 수정 후 정상 작동 예상)
    const payload = { participants: filteredParticipants };
    
    console.log('전송할 데이터:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await api.post('/api/rooms/create', payload);
      console.log('채팅방 생성 성공:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number; data: unknown } };
        
        if (axiosError.response.status === 403) {
          throw new Error('권한이 없습니다. 백엔드 SecurityConfig 수정이 필요합니다.');
        } else if (axiosError.response.status === 400) {
          throw new Error('잘못된 요청입니다. @RequestBody 어노테이션 추가가 필요합니다.');
        }
      }
      
      throw error;
    }
  },

  getUserRooms: async (username: string): Promise<MessengerRoom[]> => {
    console.log('📂 채팅방 목록 요청 시작 - 사용자:', username);
    
    // 최대 3번 재시도
    const maxRetries = 3;
    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📂 채팅방 목록 요청 시도 ${attempt}/${maxRetries}`);
        
        // 요청 시작 시간 기록
        const startTime = Date.now();
        
        // API 호출
        const response = await api.get(`/api/rooms/user/${username}`);
        
        // 응답 처리
        let rooms = response.data;
        const duration = Date.now() - startTime;
        
        console.log(`📦 원본 응답 데이터:`, JSON.stringify(rooms, null, 2));
        
        // 데이터 타입 및 구조 검증
        if (!Array.isArray(rooms)) {
          console.warn('⚠️ 응답이 배열이 아닙니다. 서버 응답:', typeof rooms);
          rooms = []; // 안전한 기본값
        }
        
        // 타입 안전한 검증을 위한 타입가드 함수
        const isValidRoom = (room: unknown): room is MessengerRoom => {
          if (!room || typeof room !== 'object') return false;
          const r = room as Partial<MessengerRoom>;
          return typeof r.id === 'number';
        };

        // 각 채팅방 데이터 검증 및 보정
        const validatedRooms = rooms
          .filter(isValidRoom)
          .map((room: MessengerRoom) => {
            // participants 필드 검증
            if (!room.participants || !Array.isArray(room.participants)) {
              console.warn(`⚠️ 채팅방 #${room.id}의 participants가 없거나 배열이 아닙니다:`, room);
              return {
                ...room,
                participants: []
              };
            }
            return room;
        }).filter((room: MessengerRoom | null): room is MessengerRoom => room !== null);
        
        console.log(`✅ 채팅방 목록 요청 성공 (${duration}ms) - ${validatedRooms.length}개 채팅방 조회됨`, 
          validatedRooms.map((r: MessengerRoom) => ({ 
            id: r.id, 
            participantsCount: r.participants?.length || 0,
            users: r.participants?.map(p => p?.username).filter(Boolean)
          })));
        
        return validatedRooms;
      } catch (error) {
        lastError = error;
        console.error(`❌ 채팅방 목록 요청 실패 (시도 ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // 재시도 전 대기 시간 (점진적 증가)
          const waitTime = 1000 * attempt; // 1초, 2초, 3초...
          console.log(`⏱️ ${waitTime / 1000}초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // 모든 재시도 실패 후
    console.error('❌ 채팅방 목록 요청이 최대 재시도 횟수를 초과했습니다');
    throw lastError || new Error('채팅방 목록을 불러오지 못했습니다');
  },
};

export const messageAPI = {
  getMessages: async (roomId: number): Promise<MessageEntity[]> => {
    console.log('📨 메시지 목록 요청 시작 - 채팅방 ID:', roomId);
    
    // 최대 3번 재시도
    const maxRetries = 3;
    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📨 메시지 목록 요청 시도 ${attempt}/${maxRetries} - 채팅방 ID: ${roomId}`);
        
        // API 호출
        const response = await api.get('/messages', { 
          params: { roomId },
          // 타임아웃 설정 (5초)
          timeout: 5000
        });
        
        // 응답 처리
        const messages = response.data;
        console.log(`✅ 메시지 목록 요청 성공 - ${messages.length}개 메시지 로드됨 (채팅방: ${roomId})`);
        
        return messages;
      } catch (error) {
        lastError = error;
        console.error(`❌ 메시지 목록 요청 실패 (시도 ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // 재시도 전 대기 시간 (점진적 증가)
          const waitTime = 800 * attempt; // 0.8초, 1.6초, 2.4초...
          console.log(`⏱️ ${waitTime / 1000}초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // 모든 재시도 실패 후
    console.error('❌ 메시지 목록 요청이 최대 재시도 횟수를 초과했습니다');
    throw lastError || new Error('메시지 목록을 불러오지 못했습니다');
  },

  // REST API를 통한 메시지 저장 (WebSocket과 함께 사용)
  saveMessage: async (message: {
    senderUsername: string;
    roomId: number;
    content: string;
    when: string;
  }): Promise<MessageEntity> => {
    console.log('💾 메시지 DB 저장 API 호출:', message);
    const response = await api.post('/messages/save', message);
    return response.data;
  }
};

export default api;
