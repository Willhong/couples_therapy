# Requirements: CouplesAI

**Defined:** 2026-01-22
**Core Value:** 갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Safety

- [ ] **AUTH-01**: 사용자가 이메일/비밀번호로 계정 생성
- [ ] **AUTH-02**: 사용자가 로그인 후 세션 유지 (앱 재시작 시에도)
- [ ] **AUTH-03**: 파트너 초대 코드 생성 및 계정 연결
- [ ] **AUTH-04**: 연결된 파트너 정보 확인 및 연결 해제

### Legal & Ethical Foundation

- [ ] **SAFE-01**: 녹음 시작 전 양자 동의 확인 시스템 (법적 필수)
- [ ] **SAFE-02**: 온보딩 시 학대 관계 스크리닝 (위험 관계 감지)
- [ ] **SAFE-03**: 민감 데이터 암호화 저장 (AES-256)
- [ ] **SAFE-04**: "치료 대체 아님" 명확한 고지 및 동의

### Onboarding

- [ ] **ONBD-01**: 간단한 관계 평가 설문 (애착 유형, 소통 스타일)
- [ ] **ONBD-02**: 사용자 목표 선택 (예방/개선/위기 대응)
- [ ] **ONBD-03**: 파트너 초대 플로우

### Personal Recording

- [ ] **RECR-01**: 채팅 형태로 상황/감정 기록
- [ ] **RECR-02**: 음성으로 상황/감정 기록 (STT 변환)
- [ ] **RECR-03**: 기록에 대한 AI 리프레이밍 피드백 제공
- [ ] **RECR-04**: 기록 히스토리 조회

### Conflict Recording & Analysis

- [ ] **CONF-01**: "갈등 기록" 버튼으로 녹음 시작 (싸움 전/후 선택)
- [ ] **CONF-02**: 녹음 완료 후 음성 -> 텍스트 전사
- [ ] **CONF-03**: 전사된 대화에서 화자 분리 (Speaker Diarization)
- [ ] **CONF-04**: 갈등 내용 AI 분석 및 리프레이밍 생성

### Reframing & Insights

- [ ] **REFR-01**: "상대는 이렇게 들었을 수 있음" 관점 전환 제시
- [ ] **REFR-02**: 구체적인 다음 행동 제안 (실행 팁)
- [ ] **REFR-03**: 분석 결과 파트너와 공유 (공유 레벨 선택)
- [ ] **REFR-04**: 비판단적 톤 유지 (누가 맞다/틀리다 없음)

### Conflict Patterns

- [ ] **PATN-01**: 반복되는 갈등 주제 식별 ("돈 문제로 N번째 대화")
- [ ] **PATN-02**: 트리거 워드/패턴 하이라이트 ("넌 항상~")
- [ ] **PATN-03**: 시간에 따른 갈등 빈도 추이

### Cool-down

- [ ] **COOL-01**: 쿨다운 타이머 시작 (10분 기본)
- [ ] **COOL-02**: 쿨다운 중 호흡/명상 가이드 제공
- [ ] **COOL-03**: 쿨다운 완료 후 다시 대화하기 프롬프트

### Communication Exercises

- [ ] **COMM-01**: 일일 대화 주제 프롬프트 제공
- [ ] **COMM-02**: 파트너 둘 다 답변 후 서로 공개
- [ ] **COMM-03**: 대화 주제 라이브러리 (카테고리별)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Engagement

- **ENGM-01**: 일일 참여 스트릭 (연속 사용 일수)
- **ENGM-02**: 참여 리마인더 푸시 알림
- **ENGM-03**: 진행 상황 시각화 (관계 건강 점수)

### Crisis Detection

- **CRIS-01**: 위험 신호 자동 감지 (학대, 자해 언급)
- **CRIS-02**: 위기 상황 시 전문 상담사 연결 안내
- **CRIS-03**: 위기 핫라인 정보 제공

### Advanced Analysis

- **ADVN-01**: 감정 온도 시각화 그래프
- **ADVN-02**: 장기 관계 트렌드 리포트 (월간)
- **ADVN-03**: 실시간 텍스트 톤 체크 (보내기 전)

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

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| SAFE-01 | Phase 1 | Complete |
| SAFE-02 | Phase 1 | Complete |
| SAFE-03 | Phase 1 | Complete |
| SAFE-04 | Phase 1 | Complete |
| ONBD-01 | Phase 2 | Complete |
| ONBD-02 | Phase 2 | Complete |
| ONBD-03 | Phase 4 | Pending |
| RECR-01 | Phase 2 | Complete |
| RECR-02 | Phase 3 | Complete |
| RECR-03 | Phase 2 | Complete |
| RECR-04 | Phase 2 | Complete |
| CONF-01 | Phase 3 | Complete |
| CONF-02 | Phase 3 | Complete |
| CONF-03 | Phase 3 | Complete |
| CONF-04 | Phase 3 | Complete |
| REFR-01 | Phase 2 | Complete |
| REFR-02 | Phase 2 | Complete |
| REFR-03 | Phase 2 | Complete |
| REFR-04 | Phase 2 | Complete |
| PATN-01 | Phase 3 | Complete |
| PATN-02 | Phase 3 | Complete |
| PATN-03 | Phase 3 | Complete |
| COOL-01 | Phase 4 | Pending |
| COOL-02 | Phase 4 | Pending |
| COOL-03 | Phase 4 | Pending |
| COMM-01 | Phase 4 | Pending |
| COMM-02 | Phase 4 | Pending |
| COMM-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-02-03 after Phase 3 completion*
