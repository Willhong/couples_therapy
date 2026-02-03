---
status: complete
phase: 03-audio-pipeline
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md
started: 2026-02-03T08:15:00+09:00
completed: 2026-02-03T08:30:00+09:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: complete
name: UAT Complete
status: All testable items evaluated

## Tests

### 1. Voice Recording (Narration Mode)
expected: Record 탭에서 "혼자 기록" 모드를 선택하면 녹음 화면이 나타남. 빨간 녹음 버튼을 누르면 실시간 파형(waveform) 시각화와 경과 시간(MM:SS)이 표시되며 녹음 진행. 정지 버튼을 누르면 미리듣기 화면에서 녹음 재생/일시정지, 다시 녹음, 취소, 제출 가능.
result: issue
issue: 실시간 파형 렉 발생. 다시 듣기 기능 확인 필요 (미리듣기 화면 재생 버튼 존재 여부)
severity: medium

### 2. Guided Prompts During Recording
expected: 녹음 화면 하단에 한국어 가이드 프롬프트가 카테고리별(상황/감정/필요) 가로 스크롤 칩으로 표시됨. 프롬프트를 탭하면 녹음 중 무엇을 말할지 참고 가능.
result: issue
issue: 프롬프트는 보이지만 선택 가능하다는 것이 직관적이지 않음 (UX 개선 필요)
severity: low

### 3. Audio Upload & Transcription
expected: 녹음 제출 후 업로드 → 처리 중 상태가 표시됨. 완료되면 자동으로 전사 결과 확인 가능한 화면(post-recording-choice)으로 이동. 한국어 음성이 텍스트로 정확하게 변환됨.
result: issue
issue: 녹음 제출 시 timeout 발생 - 업로드 실패
severity: high

### 4. Transcript Chat-Bubble Display
expected: 전사 결과 보기를 누르면 채팅 버블 스타일로 전사 텍스트가 표시됨. 각 버블에 화자 라벨, 타임스탬프 표시. 상단에 오디오 플레이어(재생/일시정지, 탐색 바, 시간 표시)가 있음.
result: blocked
blocked_by: Test 3 (업로드 타임아웃)

### 5. Post-Transcription Actions
expected: 혼자 기록(narration) 완료 후 선택 화면에 3가지 액션 카드가 표시됨: 리프레이밍(보라색), 위로 받기(노란색), 그냥 보관(회색). 선택하면 해당 작업이 수행됨.
result: blocked
blocked_by: Test 3 (업로드 타임아웃)

### 6. Unified Conversation List
expected: Home 탭에서 텍스트 채팅과 오디오 녹음이 하나의 목록에 시간순으로 표시됨. 각 카드에 유형 아이콘(채팅/마이크), 한국어 유형 배지, 제목, 미리보기, 상대 시간 표시. 아래로 당기면 새로고침, 스크롤하면 추가 로딩.
result: blocked
blocked_by: Test 3 (업로드 타임아웃)

### 7. Type-Aware Navigation from List
expected: 대화 목록에서 텍스트 항목을 탭하면 채팅 화면으로, 오디오 항목을 탭하면 전사 결과 화면으로 이동함.
result: blocked
blocked_by: Test 3 (업로드 타임아웃)

### 8. 4-Tab Navigation
expected: 하단에 4개 탭이 표시됨: Home, Chat, Record, Insights. 각 탭을 탭하면 해당 화면으로 이동.
result: pass

### 9. Live Recording Consent Flow
expected: Record 탭에서 "함께 기록" 모드를 선택하면 파트너에게 녹음 동의 요청이 전송됨. 파트너가 승인하면 자동으로 녹음 시작(500ms 후). 파트너가 거절하면 혼자 기록(narration) 모드로 전환 옵션 제공.
result: issue
issue: |
  1. 혼자 기록하기 화면에 뒤로가기 버튼 없음
  2. 다른 탭 갔다가 돌아와도 뒤로 못감
  3. 동의 대기중 화면 취소 버튼 크기 이상함
  4. 홈 화면 "갈등 녹음"과 녹음 탭 "함께 녹음하기" 기능이 다름 (불일치)
  5. [BUG] 홈 화면 갈등 녹음: 한쪽만 동의해도 둘 다 동의했다고 표시됨
  6. [BUG] 녹음 탭 함께 녹음하기: 양쪽 다 동의해도 동의 대기중 상태 유지됨
severity: high

### 10. Partner Recording Indicator
expected: 라이브 녹음 중 파트너 기기에 어두운 빨간색 오버레이가 표시됨. 깜빡이는 점, 파트너 이름, 경과 시간(MM:SS), 정지 버튼 포함.
result: blocked
blocked_by: Test 9 (동의 플로우 버그로 라이브 녹음 진입 불가)

### 11. Insights Dashboard
expected: Insights 탭에서 대시보드가 표시됨: 상단 통계 행(총 세션, 트리거 수, 평균 갈등 수준), 주간 요약 카드(기간, 세션 수, 추세 배지, AI 요약, 트리거 칩), 갈등 빈도 라인 차트, 주제 분포 바 차트, 갈등 추세 차트. 데이터 없으면 "아직 분석할 데이터가 없어요" 빈 상태 표시.
result: issue
issue: |
  Celery Redis 연결 실패 - 백엔드 서비스 다운
  "Retry limit exceeded while trying to reconnect to the Celery redis result store backend"
  패턴 분석 큐잉 실패로 Insights API 호출 불가
severity: high

### 12. Trigger Phrase Highlighting in Transcripts
expected: 전사 결과에서 파트너(비-사용자) 발언 버블에 트리거 문구("넌 항상", "넌 절대" 등)가 빨간-주황색 배경으로 하이라이트됨. 사용자 발언 버블에는 하이라이트 없음.
result: blocked
blocked_by: Test 3 (업로드 타임아웃)

### 13. Comfort Mode
expected: 전사 후 "위로 받기" 액션을 선택하면, 리프레이밍이 아닌 공감적이고 위로하는 AI 응답을 받을 수 있음.
result: blocked
blocked_by: Test 3 (업로드 타임아웃)

## Summary

total: 13
passed: 1
issues: 5
pending: 0
blocked: 7
skipped: 0

## Gaps

### GAP-1: 파형 시각화 성능 (medium)
- **Source:** Test 1
- **Issue:** 실시간 파형 렉 발생
- **Root cause:** TBD - 100ms polling interval 또는 View 기반 렌더링 성능 문제 추정
- **Fix:** useWaveform hook 최적화 또는 polling interval 조정

### GAP-2: 가이드 프롬프트 UX (low)
- **Source:** Test 2
- **Issue:** 프롬프트가 선택 가능하다는 것이 직관적이지 않음
- **Fix:** 시각적 힌트 추가 (tap 아이콘, 애니메이션, 또는 툴팁)

### GAP-3: 오디오 업로드 타임아웃 (high, blocking)
- **Source:** Test 3
- **Issue:** 녹음 제출 시 타임아웃 발생
- **Root cause:** TBD - 네트워크, 파일 크기, 백엔드 처리 시간 확인 필요
- **Fix:** 타임아웃 설정 검토, 업로드 진행 상태 개선, 에러 핸들링

### GAP-4: 녹음 화면 네비게이션 (medium)
- **Source:** Test 9
- **Issue:** 혼자 기록하기 화면에 뒤로가기 버튼 없음, 탭 전환 후에도 뒤로 못감
- **Fix:** RecordingScreen에 뒤로가기 버튼 추가, 상태 리셋 로직 검토

### GAP-5: 동의 대기 UI (low)
- **Source:** Test 9
- **Issue:** 취소 버튼 크기 이상함
- **Fix:** LiveConsentFlow 스타일 수정

### GAP-6: 홈/녹음탭 동의 플로우 불일치 (high)
- **Source:** Test 9
- **Issue:** 홈 화면 "갈등 녹음"과 녹음 탭 "함께 녹음하기" 동작이 다름
- **Fix:** 두 진입점이 동일한 LiveConsentFlow를 사용하도록 통합

### GAP-7: 동의 상태 버그 - 홈 화면 (high, critical)
- **Source:** Test 9
- **Issue:** 홈 화면에서 한쪽만 동의해도 둘 다 동의했다고 표시됨
- **Root cause:** TBD - WebSocket 메시지 핸들링 또는 상태 체크 로직 오류
- **Fix:** 동의 상태 검증 로직 수정

### GAP-8: 동의 상태 버그 - 녹음 탭 (high, critical)
- **Source:** Test 9
- **Issue:** 양쪽 다 동의해도 동의 대기중 상태 유지됨
- **Root cause:** TBD - WebSocket 이벤트 수신 또는 상태 전이 로직 오류
- **Fix:** useLiveRecording hook 상태 전이 로직 수정

### GAP-9: Celery/Redis 인프라 (high, blocking)
- **Source:** Test 11
- **Issue:** Celery Redis 연결 실패로 패턴 분석 및 Insights API 불가
- **Root cause:** Redis 서버 미실행 또는 연결 설정 오류
- **Fix:** Redis 서비스 확인, Celery worker 재시작, 연결 설정 검증
