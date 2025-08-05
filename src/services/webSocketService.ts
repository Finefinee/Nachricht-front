import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { SendMessageRequest, MessageEntity } from '../types';

class WebSocketService {
  private client: Client | null = null;
  private connected = false;
  private currentUser: string | null = null;
  private messageCallback: ((message: MessageEntity) => void) | null = null;

  connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        console.log('이미 WebSocket에 연결되어 있습니다.');
        resolve();
        return;
      }

      this.currentUser = username;
      
      // SockJS를 사용하여 WebSocket 연결 생성
      const socket = new SockJS('http://localhost:8080/ws-chat');
      
      this.client = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          console.log('STOMP Debug:', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.client.onConnect = (frame) => {
        console.log('✅ WebSocket 연결 성공:', frame);
        this.connected = true;
        
        // 개인 메시지 큐 구독 (/queue/user.{username})
        this.client?.subscribe(`/queue/user.${username}`, (message) => {
          console.log('📨 메시지 수신:', message.body);
          
          try {
            const receivedMessage: SendMessageRequest = JSON.parse(message.body);
            
            // SendMessageRequest를 MessageEntity 형태로 변환
            const messageEntity: MessageEntity = {
              id: Date.now(), // 임시 ID
              sender: {
                username: receivedMessage.senderUsername,
                role: 'USER' as const
              },
              room: {
                id: receivedMessage.roomId,
                participants: []
              },
              content: receivedMessage.content,
              sentAt: new Date().toISOString()
            };
            
            if (this.messageCallback) {
              this.messageCallback(messageEntity);
            }
          } catch (error) {
            console.error('메시지 파싱 실패:', error);
          }
        });
        
        resolve();
      };

      this.client.onStompError = (frame) => {
        console.error('❌ STOMP 오류:', frame.headers['message']);
        console.error('상세 내용:', frame.body);
        this.connected = false;
        reject(new Error('WebSocket 연결 실패'));
      };

      this.client.onWebSocketError = (error) => {
        console.error('❌ WebSocket 오류:', error);
        this.connected = false;
        reject(new Error('WebSocket 연결 실패'));
      };

      // 연결 시작
      this.client.activate();
    });
  }

  disconnect(): void {
    if (this.client && this.connected) {
      this.client.deactivate();
      this.connected = false;
      this.currentUser = null;
      console.log('🔌 WebSocket 연결 해제');
    }
  }

  sendMessage(roomId: number, content: string): void {
    if (!this.connected || !this.client || !this.currentUser) {
      throw new Error('WebSocket이 연결되지 않았습니다.');
    }

    const message: SendMessageRequest = {
      senderUsername: this.currentUser,
      roomId: roomId,
      content: content,
      when: new Date().toISOString()
    };

    console.log('📤 메시지 전송:', message);

    // /app/chat.send로 메시지 전송
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(message),
    });
  }

  onMessage(callback: (message: MessageEntity) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentUser(): string | null {
    return this.currentUser;
  }
}

// 싱글톤 인스턴스
export const webSocketService = new WebSocketService();
