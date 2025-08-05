<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Nachricht Frontend - 메시징 앱 프론트엔드

이 프로젝트는 Spring Boot 백엔드와 연동되는 React TypeScript 메시징 앱 프론트엔드입니다.

## 백엔드 API 명세

### 인증 API
- `POST /auth/login` - 로그인 (username, password)
- `POST /auth/signup` - 회원가입 (username, password)  
- `POST /auth/refresh` - 토큰 갱신 (refreshToken)

### 채팅방 API
- `POST /api/rooms/create` - 채팅방 생성 (participants: string[])
- `GET /api/rooms/user/{username}` - 사용자 채팅방 목록

### 메시지 API  
- `GET /messages?roomId=` - 채팅방 메시지 조회

### WebSocket
- 엔드포인트: `/ws-chat`
- 메시지 전송: `/app/chat.send`
- 구독: `/queue/user.{username}`

## 기술 스택
- React 18 + TypeScript
- Vite
- TailwindCSS
- STOMP over WebSocket
- JWT 인증
- React Router

## 코딩 가이드라인
- 함수형 컴포넌트 사용
- TypeScript strict 모드
- 백엔드 DTO와 일치하는 타입 정의
- WebSocket 연결 상태 관리
- JWT 토큰 자동 갱신
- 반응형 디자인
