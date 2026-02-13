# Requirements: CouplesAI

**Defined:** 2026-01-22
**Core Value:** 갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍

## v1 Requirements (Validated -- v1.0 Complete)

All v1 requirements shipped in v1.0 (2026-02-08). See MILESTONES.md for details.

### Authentication & Safety
- [x] **AUTH-01**: 사용자가 이메일/비밀번호로 계정 생성
- [x] **AUTH-02**: 사용자가 로그인 후 세션 유지 (앱 재시작 시에도)
- [x] **AUTH-03**: 파트너 초대 코드 생성 및 계정 연결
- [x] **AUTH-04**: 연결된 파트너 정보 확인 및 연결 해제

### Legal & Ethical Foundation
- [x] **SAFE-01**: 녹음 시작 전 양자 동의 확인 시스템
- [x] **SAFE-02**: 온보딩 시 학대 관계 스크리닝
- [x] **SAFE-03**: 민감 데이터 암호화 저장 (Fernet)
- [x] **SAFE-04**: "치료 대체 아님" 명확한 고지 및 동의

### Onboarding
- [x] **ONBD-01**: 간단한 관계 평가 설문
- [x] **ONBD-02**: 사용자 목표 선택
- [x] **ONBD-03**: 파트너 초대 플로우

### Personal Recording
- [x] **RECR-01**: 채팅 형태로 상황/감정 기록
- [x] **RECR-02**: 음성으로 상황/감정 기록 (STT 변환)
- [x] **RECR-03**: 기록에 대한 AI 리프레이밍 피드백 제공
- [x] **RECR-04**: 기록 히스토리 조회

### Conflict Recording & Analysis
- [x] **CONF-01**: 녹음 시작 (싸움 전/후 선택)
- [x] **CONF-02**: 녹음 완료 후 음성->텍스트 전사
- [x] **CONF-03**: 전사된 대화에서 화자 분리
- [x] **CONF-04**: 갈등 내용 AI 분석 및 리프레이밍 생성

### Reframing & Insights
- [x] **REFR-01**: 관점 전환 제시
- [x] **REFR-02**: 구체적인 다음 행동 제안
- [x] **REFR-03**: 분석 결과 파트너와 공유
- [x] **REFR-04**: 비판단적 톤 유지

### Conflict Patterns
- [x] **PATN-01**: 반복되는 갈등 주제 식별
- [x] **PATN-02**: 트리거 워드/패턴 하이라이트
- [x] **PATN-03**: 시간에 따른 갈등 빈도 추이

### Cool-down & Communication
- [x] **COOL-01**: 쿨다운 타이머
- [x] **COOL-02**: 쿨다운 중 호흡/명상 가이드
- [x] **COOL-03**: 쿨다운 완료 후 프롬프트
- [x] **COMM-01**: 일일 대화 주제 프롬프트
- [x] **COMM-02**: 파트너 둘 다 답변 후 공개
- [x] **COMM-03**: 대화 주제 라이브러리

---

## v1.1 Requirements

Requirements for Intelligence & Launch milestone. Each maps to roadmap phases.

### Foundation Fixes

- [ ] **FNDX-01**: 분석 에이전트 시그니처를 sync (state, model) 패턴으로 통일하여 분석 그래프가 실행 가능
- [ ] **FNDX-02**: on_conversation_ended, on_checkin_submitted 이벤트 트리거를 실제 뷰에 연결
- [ ] **FNDX-03**: asyncio.run() 이벤트 루프 충돌을 해결하여 ASGI/Daphne 프로덕션 배포 가능
- [ ] **FNDX-04**: chat_graph.py에 lazy compilation 적용하여 임포트 시 에러 방지
- [ ] **FNDX-05**: 트리거->분석->리포트 저장 end-to-end 테스트 통과

### Stack Modernization

- [ ] **STAK-01**: 백엔드 의존성 최신 버전 업데이트 (langgraph 1.0.8, langchain-core 1.2.11, psycopg 3.3.2 등)
- [ ] **STAK-02**: 모바일 의존성 최신 호환 버전 확인 및 유지

### Chat Agent Transformation

- [ ] **AGNT-01**: Chat Agent가 therapeutic listener로 동작 (경청+공감 우선, 즉시 분석 없음)
- [ ] **AGNT-02**: 4단계 대화 페이즈 자동 전환 (초기->탐색->심화->정리)
- [ ] **AGNT-03**: AI가 사용자의 애착유형/갈등스타일/최근 패턴을 참조하여 개인화된 응답 생성
- [ ] **AGNT-04**: 6차원 정보 체크리스트 추적 (갈등상황/근본원인/내감정/상대감정/시도한해결책/원하는결과)
- [ ] **AGNT-05**: 인사이트 준비도 진행률을 사용자에게 표시 ("인사이트 준비: 40%")
- [ ] **AGNT-06**: 대화 종료 시 마이크로 인사이트 제공 (짧은 요약/반영)
- [ ] **AGNT-07**: ACCUMULATIVE_THERAPY_ENABLED 피처 플래그로 점진적 전환

### Intelligence Analysis

- [ ] **ANAL-01**: TherapyDataCollector가 9개 소스에서 치료 컨텍스트를 수집
- [ ] **ANAL-02**: 5개 전문 에이전트가 LangGraph 분석 그래프로 배경 분석 실행 (패턴/감정/균형/해결/합성)
- [ ] **ANAL-03**: Ethics Guardian이 모든 분석 결과에 대해 안전/편향/문화적 적절성 검증
- [ ] **ANAL-04**: 4-tier 트리거 시스템 작동 (위기 즉시/임계값 초과/데이터 충분/주기적)
- [ ] **ANAL-05**: 분석 간 48시간 쿨다운으로 과다 분석 방지
- [ ] **ANAL-06**: 에이전트별 30초 타임아웃 + 일일 비용 상한 적용

### Insight Delivery

- [ ] **INSG-01**: InsightReport 별도 화면에서 리포트 목록 조회 (제목/요약/날짜/상태)
- [ ] **INSG-02**: 리포트 상세보기 (패턴분석/감정해석/균형분석/해결제안/추천활동)
- [ ] **INSG-03**: 리포트 읽음 표시 + 미읽음 카운트 뱃지
- [ ] **INSG-04**: 새 리포트 완성 시 푸시 알림 전송
- [ ] **INSG-05**: 파트너 데이터를 참고하되 직접 인용 없음 (프라이버시 보장)

### Health & Dashboard

- [ ] **HLTH-01**: Health Score 0-100 일일 산출 (기분25%/에스컬레이션25%/참여도20%/패턴심각도15%/쿨다운15%)
- [ ] **HLTH-02**: 건강점수 트렌드 표시 (상승/하강/안정 + 30일 히스토리)
- [ ] **HLTH-03**: 기분-패턴 상관관계 분석 서비스 (갈등일 vs 비갈등일 기분 비교, 위험일 감지)
- [ ] **HLTH-04**: 건강점수 약점 기반 스마트 추천 (기분저하->감사 프롬프트, 에스컬레이션->쉬운 활동)
- [ ] **HLTH-05**: 홈 대시보드 재설계 (건강점수+오늘의 할일+리포트 뱃지+파트너 상태 한 화면)
- [ ] **HLTH-06**: 커플 레벨 건강점수 (두 사용자 점수 평균)

### Production Readiness

- [ ] **PROD-01**: SQLite에서 PostgreSQL 16으로 마이그레이션 (암호화 필드 보존, 커스텀 ORM 스크립트)
- [ ] **PROD-02**: 푸시 알림 백엔드 인프라 구축 (PushToken 모델, 등록 엔드포인트, 알림 서비스)
- [ ] **PROD-03**: 모바일 푸시 알림 설정 (Development Build 전환, 알림 채널, 권한 요청)
- [ ] **PROD-04**: 성능 최적화 (데이터베이스 인덱스, 쿼리 최적화, Redis 캐시 전략)
- [ ] **PROD-05**: App Store 출시 준비 (프로비저닝, 메타데이터, 스크린샷, 심사 대응)

---

## Future Requirements

Deferred beyond v1.1. Tracked but not in current roadmap.

### v2+

- **ADVN-01**: 감정 온도 시각화 그래프
- **ADVN-02**: 장기 관계 트렌드 리포트 (월간)
- **ADVN-03**: 실시간 텍스트 톤 체크 (보내기 전)
- **DLVR-01**: 대화 중 인사이트 전달 개선 (별도 리포트 화면 안정화 후)
- **EFFT-01**: 활동 효과성 추적 (충분한 완료 데이터 축적 후)
- **PRMT-01**: 프롬프트 응답 정렬 분석 (양쪽 파트너 활발 사용 후)
- **RPRT-01**: 리포트 필터링/정렬/탭 UI
- **HLTH-07**: 고급 건강점수 시각화 (차트, 트렌드 그래프)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| "누가 맞나" 판정 | 적대적 역학 강화, 치료에 해로움 |
| 실시간 중재자 역할 | 자연스러운 대화 흐름 방해 |
| 라이브 상담사 세션 | 다른 제품 카테고리, 복잡도 높음 |
| 소셜 기능/커뮤니티 | 프라이버시 우선, 포커스 분산 |
| 웹 버전 | 모바일 앱 우선, 이후 확장 |
| 동의 없는 녹음 | 법적 문제, 신뢰 파괴 |
| 아첨하는 동조 | 실제 도움 방해 |
| 메시지별 다중 에이전트 분석 | 비용 높고 얕은 인사이트, 축적형 패러다임과 상충 |
| 대화 중 강제 인사이트 전달 | 감정적 순간에 분석 강요는 역효과 |
| 실시간 건강점수 업데이트 | 갈등 중 점수 하락 표시는 불안 유발 |
| 파트너 패턴 원문 공유 | 갈등 무기화 방지 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1 (All Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01~04 | Phase 1 | Complete |
| SAFE-01~04 | Phase 1 | Complete |
| ONBD-01~03 | Phase 2, 4 | Complete |
| RECR-01~04 | Phase 2, 3 | Complete |
| CONF-01~04 | Phase 3 | Complete |
| REFR-01~04 | Phase 2 | Complete |
| PATN-01~03 | Phase 3 | Complete |
| COOL-01~03 | Phase 4 | Complete |
| COMM-01~03 | Phase 4 | Complete |

### v1.1

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDX-01 | Phase 5: Foundation & Stack | Pending |
| FNDX-02 | Phase 5: Foundation & Stack | Pending |
| FNDX-03 | Phase 5: Foundation & Stack | Pending |
| FNDX-04 | Phase 5: Foundation & Stack | Pending |
| FNDX-05 | Phase 5: Foundation & Stack | Pending |
| STAK-01 | Phase 5: Foundation & Stack | Pending |
| STAK-02 | Phase 5: Foundation & Stack | Pending |
| PROD-01 | Phase 6: Infrastructure | Pending |
| PROD-02 | Phase 6: Infrastructure | Pending |
| PROD-03 | Phase 6: Infrastructure | Pending |
| AGNT-01 | Phase 7: Chat Agent | Pending |
| AGNT-02 | Phase 7: Chat Agent | Pending |
| AGNT-03 | Phase 7: Chat Agent | Pending |
| AGNT-04 | Phase 7: Chat Agent | Pending |
| AGNT-05 | Phase 7: Chat Agent | Pending |
| AGNT-06 | Phase 7: Chat Agent | Pending |
| AGNT-07 | Phase 7: Chat Agent | Pending |
| ANAL-01 | Phase 8: Analysis & Insights | Pending |
| ANAL-02 | Phase 8: Analysis & Insights | Pending |
| ANAL-03 | Phase 8: Analysis & Insights | Pending |
| ANAL-04 | Phase 8: Analysis & Insights | Pending |
| ANAL-05 | Phase 8: Analysis & Insights | Pending |
| ANAL-06 | Phase 8: Analysis & Insights | Pending |
| INSG-01 | Phase 8: Analysis & Insights | Pending |
| INSG-02 | Phase 8: Analysis & Insights | Pending |
| INSG-03 | Phase 8: Analysis & Insights | Pending |
| INSG-04 | Phase 8: Analysis & Insights | Pending |
| INSG-05 | Phase 8: Analysis & Insights | Pending |
| HLTH-01 | Phase 9: Health Dashboard & Launch | Pending |
| HLTH-02 | Phase 9: Health Dashboard & Launch | Pending |
| HLTH-03 | Phase 9: Health Dashboard & Launch | Pending |
| HLTH-04 | Phase 9: Health Dashboard & Launch | Pending |
| HLTH-05 | Phase 9: Health Dashboard & Launch | Pending |
| HLTH-06 | Phase 9: Health Dashboard & Launch | Pending |
| PROD-04 | Phase 9: Health Dashboard & Launch | Pending |
| PROD-05 | Phase 9: Health Dashboard & Launch | Pending |

**Coverage:**
- v1 requirements: 32 total -- all complete
- v1.1 requirements: 36 total -- all mapped to phases
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*v1.1 requirements added: 2026-02-13*
*v1.1 traceability mapped: 2026-02-13*
