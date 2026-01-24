---
status: investigating
trigger: "모바일 앱에서 대화(chat) 탭을 누르면 Maximum update depth exceeded 에러가 발생"
created: 2026-01-24T10:00:00Z
updated: 2026-01-24T10:00:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: react-native-gifted-chat v1.1.1이 React 19와 호환되지 않음 (라이브러리가 React 16 대상으로 작성됨)
test: GiftedChat 제거하고 기본 React Native 컴포넌트로 대체
expecting: 에러 사라짐 -> 라이브러리 문제 확인됨
next_action: 사용자에게 테스트 요청 중

## Symptoms

expected: chat 탭 클릭 시 채팅 화면 정상 렌더링
actual: "Maximum update depth exceeded" 에러 발생
errors: Maximum update depth exceeded
reproduction: 모바일 앱에서 chat 탭 클릭
started: 알 수 없음 (현재 발생 중)

## Eliminated

- hypothesis: useChat 훅의 displayMessages 메모이제이션 문제
  evidence: 메모이제이션 추가해도 에러 지속
  timestamp: 2026-01-24

- hypothesis: useStreamingResponse의 state.streamedText 의존성 문제
  evidence: 의존성 제거해도 에러 지속
  timestamp: 2026-01-24

- hypothesis: usePartnerSharing WebSocket 연결 문제
  evidence: 훅 제거해도 에러 지속
  timestamp: 2026-01-24

- hypothesis: 핸들러 함수들의 useCallback 누락
  evidence: 모든 핸들러에 useCallback 추가해도 에러 지속
  timestamp: 2026-01-24

- hypothesis: GiftedChat props로 전달되는 객체들이 매번 새로 생성
  evidence: static 상수로 이동해도 에러 지속
  timestamp: 2026-01-24

- hypothesis: ChatScreen 내부 복잡한 로직 문제
  evidence: 기본 GiftedChat만 남겨도 에러 지속
  timestamp: 2026-01-24

## Evidence

- timestamp: 2026-01-24
  checked: 사용자 제공 정보
  found: 모든 단순화 시도에도 에러 지속
  implication: GiftedChat 컴포넌트 자체 또는 React 19 호환성 문제 가능성 높음

- timestamp: 2026-01-24
  checked: package.json 버전
  found: react-native-gifted-chat ^1.0.0 (설치된 버전 1.1.1), react 19.1.0, expo ~54.0.0
  implication: 최신 GiftedChat은 2.9.x, 현재 버전은 React 16 대상으로 작성됨

- timestamp: 2026-01-24
  checked: node_modules/react-native-gifted-chat/package.json
  found: devDependencies에 "@types/react": "~16.9.35" - React 16 타겟
  implication: GiftedChat 1.x가 React 19와 호환되지 않을 가능성 매우 높음

- timestamp: 2026-01-24
  checked: GitHub Issue #2456
  found: "Maximum update depth exceeded" 이슈가 2023년 10월에 보고됨, 아직 해결되지 않음
  implication: 라이브러리 자체의 알려진 문제

- timestamp: 2026-01-24
  checked: GiftedChat.js 소스코드
  found: 클래스 컴포넌트로 구현, 내부에서 복잡한 state 관리
  implication: React 19의 새로운 동작과 충돌 가능성

## Resolution

root_cause:
fix:
verification:
files_changed: []
