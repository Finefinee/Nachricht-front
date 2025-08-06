import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { SendMessageRequest } from '../types';

class WebSocketService {
  private client: Client | null = null;
  private messageCallbacks: ((message: SendMessageRequest) => void)[] = [];
  private statusCallbacks: ((connected: boolean) => void)[] = [];

  connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 이미 연결되어 있다면 바로 resolve
      if (this.client && this.client.connected) {
        console.log('✅ 이미 WebSocket에 연결되어 있습니다.');
        resolve();
        return;
      }

      try {
        // WebSocket 연결 URL 설정 - 프론트엔드와 같은 도메인 사용
        // 자동 호스트 감지: 현재 페이지와 같은 호스트 사용
        const origin = window.location.origin;
        const SOCKET_URL = `${origin}/ws-chat`; // 현재 호스트에 연결 (Vite 프록시가 이를 처리)
        
        console.log('🔌 WebSocket 연결 시도:', SOCKET_URL, 'for user:', username, 
                   '(호스트:', window.location.hostname, ')');
        
        // 기존 연결이 있다면 정리
        if (this.client) {
          this.client.deactivate();
          this.client = null;
        }
        
        this.client = new Client({
          webSocketFactory: () => {
            console.log('🏭 SockJS 팩토리 호출');
            try {
              // SockJS 옵션 추가: 더 긴 타임아웃과 더 많은 재시도 횟수
              return new SockJS(SOCKET_URL, null, {
                transports: ['websocket', 'xhr-polling', 'xhr-streaming'],
                timeout: 30000, // 30초 타임아웃
              });
            } catch (error) {
              console.error('❌ SockJS 생성 오류:', error);
              throw error;
            }
          },
          debug: (str) => {
            // 중요한 디버그 메시지만 출력
            if (str.includes('error') || str.includes('connect') || str.includes('disconnect')) {
              console.log('STOMP Debug:', str);
            }
          },
          // 연결 끊길 시 자동 재연결 설정
          reconnectDelay: 3000,       // 3초 후 재연결 시도
          heartbeatIncoming: 30000,   // 30초마다 heartbeat 체크 
          heartbeatOutgoing: 30000,   // 30초마다 heartbeat 전송
          connectHeaders: {
            'username': username
          },
          onConnect: (frame) => {
            console.log('✅ WebSocket Connected successfully!', frame);
            this.statusCallbacks.forEach(callback => callback(true));
            
            try {
              // 개인 메시지 구독
              const subscription = this.client?.subscribe(`/queue/user.${username}`, (message) => {
                console.log('📨 Raw message received:', message.body);
                try {
                  const messageData = JSON.parse(message.body) as SendMessageRequest;
                  console.log('📨 Parsed message:', messageData);
                  this.messageCallbacks.forEach(callback => callback(messageData));
                } catch (error) {
                  console.error('❌ Message parsing failed:', error);
                }
              });
              console.log('🔔 Subscribed to:', `/queue/user.${username}`, subscription);
              
              // 연결 성공 시 보류 중인 메시지 재전송 시도
              this.sendPendingMessages();
              
              resolve();
            } catch (subscribeError) {
              console.error('❌ 구독 설정 오류:', subscribeError);
              reject(subscribeError);
            }
          },
          onDisconnect: () => {
            console.log('🔌 WebSocket Disconnected');
            this.statusCallbacks.forEach(callback => callback(false));
          },
          onStompError: (frame) => {
            console.error('❌ STOMP Error:', frame.headers);
            console.error('❌ STOMP Error Body:', frame.body);
            this.statusCallbacks.forEach(callback => callback(false));
            reject(new Error('STOMP 연결 오류: ' + frame.headers.message));
          },
          onWebSocketError: (error) => {
            console.error('❌ WebSocket Error:', error);
            this.statusCallbacks.forEach(callback => callback(false));
            reject(new Error('WebSocket 연결 오류'));
          },
          onWebSocketClose: (evt) => {
            console.log('🚪 WebSocket 연결 종료:', evt?.code, evt?.reason);
            this.statusCallbacks.forEach(callback => callback(false));
          }
        });

        console.log('🚀 Activating WebSocket client...');
        this.client.activate();

        // 타임아웃 설정 (10초)
        setTimeout(() => {
          if (this.client && !this.client.connected) {
            console.error('⏱️ WebSocket 연결 타임아웃');
            reject(new Error('WebSocket 연결 타임아웃'));
          }
        }, 10000);
      } catch (error) {
        console.error('❌ WebSocket 초기화 중 예외 발생:', error);
        reject(error);
      }
    });
  }  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  sendMessage(message: SendMessageRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('📤 Sending message via WebSocket:', message);
      
      if (!message.content || message.content.trim() === '') {
        const error = new Error('메시지 내용이 비어있습니다');
        console.error('❌', error);
        return reject(error);
      }
      
      // 로컬 스토리지에 메시지 임시 저장 (오프라인/재연결 대비)
      try {
        const pendingMessages = JSON.parse(localStorage.getItem('pending_messages') || '[]');
        pendingMessages.push(message);
        localStorage.setItem('pending_messages', JSON.stringify(pendingMessages));
        console.log('💾 메시지를 로컬에 임시 저장함 (총 대기 메시지: ' + pendingMessages.length + '개)');
      } catch (storageError) {
        console.warn('⚠️ 대기 메시지 저장 실패:', storageError);
      }
      
      if (!this.client) {
        const error = new Error('WebSocket 클라이언트가 초기화되지 않았습니다');
        console.error('❌', error);
        return reject(error);
      }
      
      if (!this.client.connected) {
        console.error('❌ WebSocket 연결 안됨, 자동 재연결 시도 예정. 현재 상태:', this.client?.connected);
        
        // 메시지는 이미 로컬에 저장했으므로 사용자에게는 성공으로 알림
        resolve();
        return;
      }
      
      try {
        this.client.publish({
          destination: '/app/chat.send',
          body: JSON.stringify(message),
          headers: {},
          skipContentLengthHeader: false,
        });
        console.log('✅ 메시지 전송 성공');
        resolve();
      } catch (error) {
        console.error('❌ 메시지 전송 실패, 로컬에는 저장됨:', error);
        // 전송 실패 시에도 로컬에는 저장되어 있으므로, 사용자에게 성공으로 알림
        resolve();
      }
    });
  }

  onMessage(callback: (message: SendMessageRequest) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  // 보류 중인 메시지 전송 시도
  sendPendingMessages(): void {
    if (!this.client?.connected) return;

    try {
      const pendingMessagesJson = localStorage.getItem('pending_messages');
      if (!pendingMessagesJson) return;
      
      const pendingMessages = JSON.parse(pendingMessagesJson) as SendMessageRequest[];
      if (pendingMessages.length === 0) return;
      
      console.log(`⏳ ${pendingMessages.length}개의 보류 중인 메시지 재전송 시도`);
      
      // 각 메시지 재전송
      let successCount = 0;
      const failedMessages: SendMessageRequest[] = [];
      
      pendingMessages.forEach(message => {
        try {
          this.client?.publish({
            destination: '/app/chat.send',
            body: JSON.stringify(message),
            headers: {},
            skipContentLengthHeader: false,
          });
          successCount++;
        } catch (error) {
          console.error('❌ 메시지 재전송 실패:', error);
          failedMessages.push(message);
        }
      });
      
      // 실패한 메시지만 다시 저장
      localStorage.setItem('pending_messages', JSON.stringify(failedMessages));
      console.log(`✅ ${successCount}/${pendingMessages.length}개 메시지 재전송 성공, ${failedMessages.length}개 실패`);
    } catch (error) {
      console.error('❌ 보류 메시지 처리 실패:', error);
    }
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
