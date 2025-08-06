# Nachricht Frontend

Spring Boot 백엔드와 연동되는 React TypeScript 메시징 앱 프론트엔드입니다.
프론트 몰라서 걍 copilot 시킴 ㅋㅋ;

## 🚀 기능

- **실시간 메시징**: WebSocket(STOMP)을 통한 실시간 1:1 채팅
- **사용자 인증**: JWT 기반 로그인/회원가입 시스템
- **채팅방 관리**: 새로운 채팅방 생성 및 기존 채팅방 목록 관리
- **반응형 디자인**: 모바일 및 데스크톱 환경 지원

## 🛠 기술 스택

- **Frontend**: React 18, TypeScript
- **빌드 도구**: Vite
- **스타일링**: TailwindCSS
- **상태 관리**: React Context API
- **실시간 통신**: STOMP over WebSocket
- **HTTP 클라이언트**: Axios
- **라우팅**: React Router DOM
- **아이콘**: Lucide React

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일에서 백엔드 서버 URL을 설정하세요:
```
VITE_API_BASE_URL=http://localhost:8080
VITE_SOCKET_URL=http://localhost:8080/ws-chat
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 프로덕션 빌드
```bash
npm run build
```
