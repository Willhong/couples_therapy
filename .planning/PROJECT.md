# CouplesAI

## What This Is

AI 기반 부부상담 모바일 앱. 부부가 각자 또는 함께 대화/갈등을 기록하면, AI가 여러 세션에 걸쳐 데이터를 축적하고 패턴을 분석하여, 관계 인사이트와 실행 가능한 조언을 제공한다. 비싸고 예약 어려운 전통 부부상담의 대안으로, 언제든 접근 가능한 관계 개선 도구.

## Core Value

**갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍** — 이것이 핵심. 분석이나 통계보다 "상대는 이렇게 들었을 수 있다"는 관점 전환이 가장 중요하다.

## Current Milestone: v1.1 Intelligence & Launch

**Goal:** 축적형 치료 인텔리전스 시스템 구축 + 프로덕션 출시 준비. Chat Agent를 therapeutic listener로 전환하고, 다중 에이전트 분석 파이프라인으로 개인화된 인사이트 리포트를 제공한다.

**Target features:**
- Chat Agent를 therapeutic listener로 전환 (경청+공감, 즉시 분석 안 함)
- 축적형 다중 에이전트 분석 시스템 (패턴/감정/균형/해결 분석)
- Insight Report 별도 화면에서 전달 (주기적 + 데이터 충분 + 위기 감지 트리거)
- 개인화된 AI 컨텍스트 주입 (UserIntelligenceService)
- Health Score + 오늘의 대시보드 홈 화면
- 기분-패턴 상관관계 분석, 추천 엔진, 쿨다운 분석
- 파트너 데이터 참고하되 직접 인용 안 함
- 백엔드-프론트엔드 gap 해소 (API contract 정렬)
- WS4 프로덕션 준비 (PostgreSQL, 푸시 알림, 성능 최적화, 앱스토어)

## Requirements

### Validated

- ✓ 개인 기록: 채팅형으로 상황/감정 기록 — v1.0 Phase 2
- ✓ 개인 기록: 음성으로 상황/감정 기록 — v1.0 Phase 3
- ✓ 갈등 녹음: 대화 녹음 후 분석 — v1.0 Phase 3
- ✓ 리프레이밍: "이렇게 말했는데, 상대는 이렇게 들었을 수 있음" 제시 — v1.0 Phase 2
- ✓ 실행 제안: 구체적인 다음 행동 팁 제공 — v1.0 Phase 2
- ✓ 부부 연결: 파트너 계정 연결 — v1.0 Phase 1
- ✓ 함께 보기: 분석 결과 둘이 함께 확인 — v1.0 Post-4

### Active

See: .planning/REQUIREMENTS.md (v1.1 scope)

### Out of Scope

- 실시간 중재자 역할 — AI가 대화 중간에 개입하는 것은 자연스러운 대화 흐름을 방해
- 전문 상담사 연결 — 플랫폼 복잡도 증가, 초기엔 AI 단독
- 웹 버전 — 모바일 앱 우선
- In-conversation insight delivery — v1.1에서는 별도 리포트 화면에 집중. 대화 중 인사이트 전달은 이후 고려

## Context

### Problem Space

Reddit 리서치 결과 주요 pain points:
- **비용**: 시간당 $150-300, 보험 미적용
- **스케줄링**: 3명 일정 조율 어려움, 대기시간 길음
- **심판 느낌**: 누가 옳은지 판정받는 느낌
- **악화 우려**: 상처만 열고 닫지 않아서 더 나빠짐

사람들이 원하는 것:
- 실행 가능한 스킬 기반 도구
- 예방적 관계 유지보수
- 비동기 옵션

### User Scenarios

1. **축적형 상담 시나리오**: 퇴근 후 갈등 상황을 채팅으로 기록 → AI가 공감하며 탐색적 질문 → 며칠간 데이터 축적 → 주간 인사이트 리포트에서 패턴과 제안 확인

2. **갈등 녹음 시나리오**: 말다툼 중 녹음 시작 → 상황 진정 후 앱에서 분석 확인 → 둘이 함께 "아, 네가 이렇게 느꼈구나" 이해

3. **대시보드 시나리오**: 홈 화면에서 관계 건강점수 확인 → 오늘 추천 활동 수행 → 기분 체크인으로 하루 마무리

### Target Users

- 위기 전 부부: 관계 개선/예방 목적
- 위기 중 부부: 심각한 갈등 상황 대응
- 공통점: 전통 부부상담의 비용/접근성 장벽을 느끼는 커플

### Technical Context (v1.0 Codebase)

- **Backend**: Django 5.x + DRF, 15 apps, 66 tests, JWT auth, fernet encryption
- **Mobile**: Expo SDK 54 + expo-router 6, React Native 0.81, 18 feature folders
- **Infra**: SQLite (dev), Redis (channels/celery), Celery for async tasks
- **AI**: OpenRouter (chat), OpenAI (transcription), LangChain
- **Existing intelligence app**: InsightReport model, basic serializers/views — needs full implementation

## Constraints

- **Tech Stack**: React Native (Expo SDK 54), Django 5.x + DRF
- **AI Framework**: LangGraph for multi-agent analysis graph
- **Privacy**: 파트너 데이터 참고하되 직접 인용 안 함. 안전 등급별 데이터 접근 제한 (CC1)
- **Revenue Model**: 프리미엄 (기본 무료 + 고급 기능 유료)
- **Backward Compatibility**: 기존 API endpoint 변경 없음, feature flag로 점진적 전환

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native 선택 | iOS/Android 동시 개발, 빠른 iteration | ✓ Good |
| 리프레이밍 중심 설계 | 관점 전환이 실제 갈등 해소에 효과적 | ✓ Good |
| 녹음 분석 포함 | 실시간 갈등 데이터가 가장 가치 있음 | ✓ Good |
| 프리미엄 모델 | 낮은 진입장벽으로 사용자 확보 후 전환 | — Pending |
| Chat Agent → therapeutic listener | 실제 상담사처럼 경청 우선, 축적 후 분석 | — Pending |
| 파트너 데이터: 참고하되 미인용 | 프라이버시와 분석 깊이의 균형 | — Pending |
| Insight delivery: 별도 리포트 화면 | 대화 중 전달보다 명확하고 구현 간결 | — Pending |
| 3-tier trigger (주기+충분+위기) | 다양한 상황에 대응하는 유연한 트리거 | — Pending |

---
*Last updated: 2026-02-13 after v1.1 milestone start*
