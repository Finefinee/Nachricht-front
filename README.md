# Nachricht Frontend

Spring Boot 백엔드와 연동되는 React TypeScript 메시징 앱 프론트엔드입니다.

## 🚀 기능

- **실시간 메시징**: WebSocket(STOMP)을 통한 실시간 1:1 채팅
- **사용자 인증**: JWT 기반 로그인/회원가입 시스템
- **채팅방 관리**: 새로운 채팅방 생성 및 기존 채팅방 목록 관리
- **반응형 디자인**: 모바일 및 데스크톱 환경 지원
- **타입 안정성**: TypeScript로 작성된 타입 안전한 코드

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

## 🏗 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── ChatSidebar.tsx  # 채팅방 목록 사이드바
│   └── ChatWindow.tsx   # 메시지 창
├── contexts/            # React Context 상태 관리
│   ├── AuthContext.tsx  # 인증 상태 관리
│   └── ChatContext.tsx  # 채팅 상태 관리
├── hooks/               # 커스텀 훅
│   ├── useAuth.ts       # 인증 훅
│   └── useChat.ts       # 채팅 훅
├── pages/               # 페이지 컴포넌트
│   ├── LoginPage.tsx    # 로그인 페이지
│   ├── RegisterPage.tsx # 회원가입 페이지
│   └── ChatPage.tsx     # 채팅 메인 페이지
├── services/            # API 및 외부 서비스
│   ├── api.ts           # REST API 클라이언트
│   └── websocket.ts     # WebSocket 클라이언트
├── types/               # TypeScript 타입 정의
│   └── index.ts         # 공통 타입
├── App.tsx              # 메인 앱 컴포넌트
└── main.tsx             # 엔트리 포인트
```

## 🔌 백엔드 연동

이 프론트엔드는 다음 백엔드 API와 연동됩니다:

### REST API
- `POST /auth/login` - 로그인
- `POST /auth/signup` - 회원가입  
- `POST /auth/refresh` - 토큰 갱신
- `POST /api/rooms/create` - 채팅방 생성
- `GET /api/rooms/user/{username}` - 사용자 채팅방 목록
- `GET /messages?roomId=` - 채팅방 메시지 조회

### WebSocket
- **엔드포인트**: `/ws-chat`
- **메시지 전송**: `/app/chat.send`
- **메시지 구독**: `/queue/user.{username}`

## 🔧 개발 가이드

### 새 기능 추가
1. `types/index.ts`에 필요한 타입 정의
2. `services/`에 API 클라이언트 메서드 추가
3. `contexts/`에 상태 관리 로직 추가
4. `components/`에 UI 컴포넌트 구현

### 스타일링
- TailwindCSS 유틸리티 클래스 사용
- `tailwind.config.js`에서 커스텀 테마 설정
- 반응형 디자인을 위한 브레이크포인트 활용

## 📄 라이센스

MIT License
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
