// 백엔드 DTO와 일치하는 타입 정의

export interface User {
  username: string;
  introduce?: string;
  profileImageUrl?: string;
  role: 'USER' | 'ADMIN';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface SendMessageRequest {
  senderUsername: string;
  roomId: number;
  content: string;
  when: string;
}

export interface MessageEntity {
  id: number;
  sender: User;
  room: MessengerRoom;
  content: string;
  sentAt: string;
}

export interface MessengerRoom {
  id: number;
  participants: User[];
}

export interface CreateMessengerRoomRequest {
  participants: string[];
}

// 프론트엔드용 상태 타입
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface ChatState {
  rooms: MessengerRoom[];
  messages: { [roomId: number]: MessageEntity[] };
  activeRoom: MessengerRoom | null;
  isLoading: boolean;
  error: string | null;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
