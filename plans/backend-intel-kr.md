백엔드 인텔리전스 업그레이드 계획 (v2 - 리뷰 후 수정본)

  CouplesAI: 모든 데이터를 연결하여 AI를 진짜 똑똑하게 만들기

  수정 사항 (v2): 아키텍트 리뷰(8건)와 크리틱 리뷰(9건)의 모든 피드백을 반영함. 주요 변경: 고위험 사용자 안전    
  게이트, 프롬프트 인젝션 살균 처리, 서비스를 core/로 이동, 위로 모드 명시적 연결, 워크스트림별 테스트 전략,     
  async/sync 경계 문서화, 캐시 설정 추가, django_celery_beat 마이그레이션, 토큰 예산 증가, 솔로 사용자 처리 공통 
  적용, communication_frequency 포함.

  배경

  CouplesAI는 16개 이상의 모델(온보딩 프로필, 기분 체크인, 패턴, 활동, 프롬프트, 쿨다운, 연속 기록, 위기
  이벤트)에 걸쳐 풍부한 사용자 데이터를 수집하지만, AI는 이 데이터와 거의 완전히 격리된 상태로 작동합니다.       
  system_prompts.py의 시스템 프롬프트는 하드코딩되어 있어 사용자 프로필, 과거 패턴, 기분 추세, 참여 데이터를 전혀
   참조하지 않습니다. reframing_graph.py 파이프라인은 대화 컨텍스트(최근 메시지 + 롤링 요약)만 LLM에 전달합니다. 
  즉, 높은 애착 불안을 가지고 매주 돈 문제로 싸우는 사용자가 이력이 없는 신규 사용자와 완전히 동일한 AI 응답을   
  받게 됩니다.

  목표: 데이터베이스에 이미 존재하는 데이터를 LLM 파이프라인에 연결하여 모든 AI 응답을 개인화하고 컨텍스트를     
  인식하게 만들고, 교차 참조 데이터로부터 파생 인텔리전스(건강 점수, 추천)를 생성합니다.

  아키텍처 개요

  현재 흐름:
    사용자_메시지 + 대화_기록 --> TWO_MODE_SYSTEM_PROMPT --> LLM --> 응답

  목표 흐름:
    사용자_메시지 + 대화_기록
      + 사용자_프로필_컨텍스트 (애착 스타일, 갈등 스타일, 목표, 소통_빈도)
      + 패턴_컨텍스트 (최근 트리거, 반복 주제, 에스컬레이션 추세)  [살균 처리됨]
      + 기분_컨텍스트 (최근 체크인, 추세 방향, 오늘의 응답)
      + 참여_컨텍스트 (연속 기록, 쿨다운 빈도, 활동 완료율)
      + 안전_컨텍스트 (risk_level이 포함 데이터를 게이팅)
      --> 동적_시스템_프롬프트 (개인화, 안전 게이트 적용) --> LLM --> 응답

  핵심 신규 컴포넌트는 backend/apps/core/services/user_intelligence.py에 위치하는 UserIntelligenceService로, 모든
   데이터 소스에서 사용자의 전체 컨텍스트 스냅샷을 조합합니다. 이 서비스의 소비자: (1) 개인화 프롬프트를 위한 LLM
   파이프라인, (2) 새로운 건강 점수 연산, (3) 새로운 추천 엔진.

  왜 core/services/이고 chat/services/가 아닌가: 이 서비스는 6개 이상의 앱(users, onboarding, checkins, patterns,
   safety, cooldown)을 가로질러 쿼리합니다. chat/에 배치하면 순환 임포트 위험이 생기고, 교차 서비스는 core/에    
  속해야 한다는 원칙에 위배됩니다.

  ---
  공통 관심사 (모든 워크스트림에 적용)

  CC1. 고위험 사용자 안전 게이트 (필수)

  SafetyAssessment 모델에는 risk_level ("low"/"moderate"/"high")과 couple_features_enabled (boolean)이 있습니다. 
  이것들이 모든 개인화를 반드시 게이팅해야 합니다:
  ┌──────────┬────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │  위험    │         허용 컨텍스트          │                          차단 컨텍스트                          │
  │   수준   │                                │                                                                 │
  ├──────────┼────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ low      │ 모든 컨텍스트                  │ 없음                                                            │
  ├──────────┼────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ moderate │ 프로필, 목표, 기분, 참여도     │ 트리거 문구, 에스컬레이션 상세                                  │
  ├──────────┼────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ high     │ 애착 스타일 라벨만, 기분(메모  │ 모든 패턴 데이터, 모든 트리거 문구, 모든 에스컬레이션 데이터,   │
  │          │ 제외)                          │ 파트너 비교                                                     │
  └──────────┴────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
  추가: couple_features_enabled == False이면 E2 파트너 대시보드와 커플 수준 건강 점수를 건너뜁니다. 개인 데이터만
   반환합니다.

  이 게이트는 UserIntelligenceService.get_ai_context()에서 구현되며, 데이터 조합 전에 확인됩니다.

  CC2. 프롬프트 인젝션 살균 처리 (필수)

  시스템 프롬프트에 주입되는 사용자 파생 콘텐츠(Pattern.content, DailyCheckIn.note, DailyCheckIn.answers)는      
  반드시 살균 처리되어야 합니다:
  - LLM 명령어 오버라이드와 유사한 콘텐츠 제거 (정규식 패턴: [SYSTEM:, ignore previous, you are now, <system> 등)
  - 개별 값을 최대 50자로 절단
  - 가능한 경우 사용자 파생 원문 콘텐츠를 시스템 메시지가 아닌 사용자 메시지 컨텍스트 섹션으로 이동
  - build_personalized_prompt() 함수는 시스템 프롬프트에서 원시 사용자 텍스트 대신 카테고리 라벨과 횟수(안전)를  
  사용

  CC3. 솔로 사용자 처리

  사용자가 couple=None이거나 커플이 pending 상태일 수 있습니다. 모든 서비스가 이를 반드시 처리해야 합니다:       
  - A1: 개인 전용 컨텍스트 반환 (파트너 패턴 없음)
  - B1: 개인 기분 상관관계만 계산
  - C1: 개인 건강 점수만 계산 (커플 평균화 건너뜀, 개인 최대값으로 제한)
  - D1: 개인 전용 추천 반환 (커플 활동 건너뜀)
  - E2: 개인 대시보드 반환 (파트너 섹션 없음)

  CC4. Async/Sync 경계

  run_reframing_pipeline()과 run_comfort_pipeline()은 async 함수입니다.
  UserIntelligenceService.get_ai_context()는 동기식 ORM 쿼리를 수행합니다. views.py의 연결부는 비동기
  파이프라인에 진입하기 전에 동기 서비스를 호출합니다. 컨텍스트 dict(순수 Python dict)는 매개변수로 전달됩니다.  
  sync_to_async 없이 비동기 코드 내에서 get_ai_context()를 호출하지 마세요.

  CC5. 암호화 필드 처리

  InsightSummary.ai_summary와 WeeklySummary.trend_text는 EncryptedTextField (fernet AES-256)를 사용합니다. 이    
  필드를 읽으면 Django가 자동 복호화합니다. 규칙:
  - 복호화된 ai_summary 또는 trend_text 값을 Redis/memcache에 캐시하지 마세요
  - 캐시된 컨텍스트 dict에는 파생/집계 값만 사용 (예: 에스컬레이션 점수 숫자, 주제 횟수) — 원시 암호화 필드      
  내용은 절대 안 됨
  - 캐시 무효화: 프로필 저장, 패턴 생성, 체크인 제출 시 사용자 캐시 삭제

  CC6. 데이터베이스 인덱스

  단일 마이그레이션에서 새 쿼리 패턴용 인덱스 추가:
  - Pattern: (user, pattern_type, created_at) 복합 인덱스 — 필터링된 시간 범위 쿼리용
  - InsightSummary: (user, created_at) 복합 인덱스 — 상관관계 조회용
  - DailyCheckIn: 이미 (user, date) unique_together가 있음 — 충분
  - CoolDown: (user, started_at) 인덱스 — 시간 범위 분석용 (필드명은 created_at이 아닌 started_at)

  ---
  워크스트림 A: 개인화 AI 컨텍스트 주입 (최우선 순위)

  해결하는 갭: 갭 1, 3 — 온보딩 데이터 미사용; 패턴 데이터가 AI에 피드백되지 않음
  의존성: 없음 (즉시 시작 가능)
  예상 변경 파일 수: 7-9

  목표

  사용자가 누구인지, 어떤 패턴을 보이는지 AI가 인식하여, 모든 응답이 일반적이지 않고 맞춤형이 되도록 합니다.     

  데이터 흐름

  UserProfile (attachment_anxiety, attachment_avoidance, conflict_style, communication_frequency)
    + UserGoals (primary_goal, focus_areas)
    + SafetyAssessment (risk_level, couple_features_enabled)  --> 안전 게이트 (CC1)
    + Pattern (최근 트리거 카테고리, 상위 반복_주제, 최신 escalation_score)  --> 살균 처리 (CC2)
    + WeeklySummary (에스컬레이션 추세 숫자만, trend_text 아님)
    --> UserIntelligenceService.get_ai_context(user_id)
    --> 구조화된 한국어 텍스트로 시스템 프롬프트에 주입
    --> run_reframing_pipeline()과 run_comfort_pipeline()에서 소비

  상세 태스크

  A1. UserIntelligenceService 생성

  - 새 파일: backend/apps/core/services/user_intelligence.py
  - 기능: 모델 간 쿼리를 통해 컨텍스트 스냅샷 dict를 구성하는 단일 서비스:
  {
    "attachment_style": {"anxiety": 4, "avoidance": 2, "label": "불안형"},
    "conflict_style": "avoid",
    "communication_frequency": "daily",  # 신규: UserProfile에서
    "primary_goal": "improvement",
    "focus_areas": ["의사소통", "감정표현"],
    "risk_level": "low",
    "couple_features_enabled": True,
    "recent_patterns": {  # risk_level == "high"이면 전체 생략
      "top_trigger_categories": ["비난", "방어"],  # 카테고리만, 원시 내용 아님
      "top_topics": [{"topic": "재정", "count": 5}, {"topic": "가사분담", "count": 3}],
      "escalation_trend": "improving",
      "avg_escalation_score": 4.2
    }
  }
  - 쿼리: UserProfile, UserGoals, SafetyAssessment (사용자별 OneToOneField — .first()가 아닌 .get() 사용),       
  Pattern (최근 30일, 빈도순 상위 5), WeeklySummary (최신 — escalation_trend와 trigger_frequency 필드만, 암호화된
   trend_text 제외)
  - 안전 게이트 (CC1): SafetyAssessment.risk_level을 먼저 확인. "high"이면 최소 컨텍스트 반환. "moderate"이면    
  트리거/에스컬레이션 상세 제외.
  - 솔로 처리 (CC3): 활성 커플이 없으면 "couple_features_enabled": False로 개인 전용 컨텍스트 반환
  - InsightSummary 처리: .exists() 확인 후 쿼리. InsightSummary 레코드가 없으면(신규 사용자) 패턴 섹션을 완전히  
  생략하고 기본값으로 대체.
  - 캐싱: Django 캐시 프레임워크를 사용하여 사용자당 1시간 캐시. 캐시 키: user_intelligence:{user_id}. 무효화:   
  UserProfile.save(), Pattern.save(), DailyCheckIn.save(), SafetyAssessment.save() 시그널.
  - 동기 제약 (CC4): 이 서비스는 동기식 ORM 쿼리만 사용. 비동기 파이프라인 코드가 아닌 동기 컨텍스트(views)에서  
  호출해야 함.
  - 인수 조건:
    - user_id가 주어지면 모든 필드가 채워진(또는 누락 데이터에 대한 합리적 기본값) 완전한 컨텍스트 dict 반환     
    - 온보딩 데이터가 없는 사용자에게 빈/기본 컨텍스트 반환 (우아한 저하)
    - 쿼리 수가 제한됨 (N+1 쿼리 없음) — 목표: 최대 6개 쿼리
    - 고위험 사용자는 최소 컨텍스트 수신 (테스트로 검증)
    - 캐시 값에 암호화 필드 내용이 나타나지 않음

  A2. 동적 시스템 프롬프트 빌더 생성

  - 수정 파일: backend/apps/chat/prompts/system_prompts.py
  - 기능: A1의 컨텍스트 dict를 받아 기존 TWO_MODE_SYSTEM_PROMPT에 ## 사용자 프로필 섹션을 추가하여 완전한 시스템 
  프롬프트 문자열을 반환하는 build_personalized_prompt(user_context: dict) -> str 함수 추가
  - 살균 처리 (CC2): 함수는 카테고리 라벨, 횟수, 사전 정의된 한국어 설명자만 사용 — 원시 사용자 텍스트 절대 사용 
  안 함. 패턴 주제는 고정 셋의 카테고리 문자열. 트리거 문구는 카테고리 라벨로 대체 (예: 실제 문구 인용 대신      
  "비난형 표현 3회").
  - 프롬프트 섹션 예시 (한국어):
  ## 사용자 프로필

  이 사용자의 특성을 참고하여 맞춤형 응답을 제공하세요:

  - 애착 스타일: 불안형 (불안 4/5, 회피 2/5) - 안심시키는 표현을 많이 사용하세요
  - 갈등 스타일: 회피형 - 직접적 대립보다 부드러운 접근을 제안하세요
  - 소통 빈도 선호: 매일 - 자주 확인하는 것을 좋아하는 사용자입니다
  - 주요 목표: 소통 개선
  - 집중 영역: 의사소통, 감정표현

  ## 과거 패턴 (최근 30일)

  이 커플에서 반복되는 패턴입니다. 대화에서 관련 주제가 나오면 패턴을 인식하고 있음을 보여주세요:
  - 반복되는 갈등 주제: 재정 (5회), 가사분담 (3회)
  - 트리거 패턴: 비난형 표현 3회, 방어적 반응 2회
  - 에스컬레이션 추세: 개선 중 (평균 4.2/10)
  - 애착 스타일 매핑: anxiety >= 4 = "불안형 가이드", avoidance >= 4 = "회피형 가이드", 둘 다 낮음 = "안정형", 둘
   다 높음 = "혼란형"
  - communication_frequency 매핑: "daily" = "매일", "weekly" = "매주", "rarely" = "가끔" — 제안 빈도 가이드에    
  영향
  - 토큰 예산: 주입 섹션에 700 토큰 미만 (한국어 멀티바이트 문자를 위해 500에서 증가). 컨텍스트가 예산을 초과하면
   우선순위 순서로 절단: (1) 애착 + 갈등 스타일 유지, (2) 목표 유지, (3) 상위 3개 주제 유지, (4) 참여 상세 제거, 
  (5) 추세 상세 제거.
  - 인수 조건:
    - 프롬프트에 사용자 고유 프로필 데이터가 포함됨 (가용 시)
    - 프롬프트가 누락 데이터를 우아하게 처리 (빈 섹션 없음)
    - 주입 섹션이 700 토큰 예산 내에 유지
    - 기존 TWO_MODE_SYSTEM_PROMPT 구조 보존 (새 섹션 추가, 교체 아님)
    - 시스템 프롬프트에 원시 사용자 생성 텍스트 없음 (카테고리/횟수만)

  A3. 리프레이밍 파이프라인에 연결

  - 수정 파일:
    - backend/apps/chat/services/reframing_graph.py — run_reframing_pipeline()이 user_context 매개변수를 받음    
    - backend/apps/chat/views.py — reframe_message()가 UserIntelligenceService를 호출하고 컨텍스트를 파이프라인에
   전달
  - 변경 사항:
    a. reframe_message() 뷰에서: conversation_context를 받은 후,
  UserIntelligenceService.get_ai_context(request.user.id) 호출 (동기 호출, 비동기 진입 전)
    b. user_context dict를 run_reframing_pipeline()에 전달
    c. run_reframing_pipeline()에서: SystemMessage(content=TWO_MODE_SYSTEM_PROMPT)를
  SystemMessage(content=build_personalized_prompt(user_context))로 교체
    d. user_context가 None 또는 비어있으면 TWO_MODE_SYSTEM_PROMPT를 변경 없이 폴백
  - 인수 조건:
    - attachment_anxiety=5인 사용자의 AI 응답이 attachment_anxiety=1인 사용자와 측정 가능하게 다름
    - AI가 관련 시 알려진 반복 주제를 참조
    - 온보딩 데이터가 없는 사용자도 유효한 응답을 받음 (현재 일반 프롬프트로 폴백)
    - 응답 시간 저하 없음 (컨텍스트 조합으로 인한 추가 지연 < 200ms)

  A3b. 위로 파이프라인에 연결 (신규 — A3에서 분리)

  - 수정 파일:
    - backend/apps/chat/services/reframing_graph.py — run_comfort_pipeline()이 user_context 매개변수를 받음      
    - backend/apps/chat/views.py — comfort_message()가 UserIntelligenceService를 호출하고 컨텍스트를 전달        
  - A3과의 핵심 차이: COMFORT_MODE_PROMPT (system_prompts.py 120-133줄)는 분석과 제안을 명시적으로 금지. 위로    
  모드 개인화에는 반드시 포함:
    - 애착 스타일과 기분 컨텍스트 (공감 보정용)
    - 소통 빈도 선호
    - 반드시 제외: 갈등 패턴, 트리거 문구, 에스컬레이션 데이터, 반복 주제 (프롬프트 스펙에 따라 위로 모드는      
  비분석적)
  - 구현: 공감 관련 컨텍스트만 COMFORT_MODE_PROMPT에 추가하는 별도의
  build_personalized_comfort_prompt(user_context: dict) -> str 생성
  - 인수 조건:
    - 위로 응답이 패턴 분석 없이 애착 스타일을 인정
    - 위로 모드 시스템 프롬프트에 갈등 데이터 없음
    - 컨텍스트 없을 시 수정되지 않은 COMFORT_MODE_PROMPT로 폴백

  A4. 테스트 (신규)

  - 새 파일: backend/apps/core/tests/test_user_intelligence.py
  - 필수 테스트:
    - test_complete_profile_context() — 모든 데이터가 있는 사용자가 전체 컨텍스트 dict 반환
    - test_partial_profile_context() — 온보딩만 있는 사용자가 프로필 전용 컨텍스트 반환
    - test_no_profile_context() — 신규 사용자가 기본값 반환
    - test_high_risk_minimal_context() — 고위험 사용자가 패턴/트리거 없음
    - test_moderate_risk_filtered_context() — 중위험 사용자가 부분 컨텍스트
    - test_solo_user_no_couple() — 활성 커플 없는 사용자가 개인 컨텍스트 반환
    - test_no_insight_summary() — InsightSummary 없는 신규 사용자가 에러 없음
    - test_cache_invalidation() — 프로필 변경 후 컨텍스트 업데이트
    - test_prompt_token_budget() — 개인화 프롬프트가 700 토큰 내 유지
    - test_no_raw_user_text_in_system_prompt() — 살균 처리 검증
    - test_comfort_prompt_excludes_patterns() — 위로 모드에 갈등 데이터 없음

  ---
  워크스트림 B: 기분-패턴 상관관계 엔진 (높은 우선순위)

  해결하는 갭: 갭 2 — 체크인 기분 데이터가 격리됨
  의존성: 없음 (A와 병렬 시작 가능)
  예상 변경 파일 수: 5-6

  목표

  기분 체크인 데이터를 대화 패턴과 상관 분석하여 기분-갈등 관계를 감지하고 사용자와 AI에 제공합니다.

  데이터 흐름

  DailyCheckIn (기분 1-5, 메모, 응답 JSON, 날짜)
    + Pattern (created_at, 카테고리, escalation_score)
    + InsightSummary (escalation_score, created_at)  [신규 사용자에겐 없을 수 있음]
    + CoolDown (started_at, completed_at)
    --> MoodPatternService.correlate(user_id, days=30)
    --> {기분_추세, 갈등일_vs_기분, 갈등전_기분_평균, 갈등후_기분_평균}

  상세 태스크

  B1. MoodPatternService 생성

  - 새 파일: backend/apps/checkins/services/mood_correlation.py
  - 기능:
    a. 사용자의 최근 N일 DailyCheckIn 로드 (answers JSON 포함)
    b. 같은 기간의 InsightSummary 레코드 로드 — .exists() 가드: 레코드 없으면 상관관계 건너뛰고 기분 전용 통계   
  반환
    c. 대화가 있는 각 날(InsightSummary.created_at로 매칭)에 대해, 해당일의 기분을 평균 기분과 비교
    d. 계산: 기분_추세 (7일 이동평균 방향), 갈등일_기분 vs 비갈등일_기분, 쿨다운_후_기분
    e. "위험일" 식별 — 기분 < 3 AND escalation_score > 5인 날
    f. DailyCheckIn.answers 향상: answers JSON이 있으면 추가 감정 신호 추출 (응답 수, 응답 길이를 참여도
  프록시로). 전체 NLP 분석은 워크스트림 F로 연기.
  - 솔로 처리 (CC3): 순수하게 개인 데이터로 작동; 커플 의존성 없음.
  - 출력 형식:
  {
    "mood_trend": "declining",  # improving/stable/declining
    "avg_mood_7d": 3.2,
    "avg_mood_30d": 3.8,
    "conflict_day_mood_avg": 2.4,      # InsightSummary 레코드 없으면 null
    "non_conflict_day_mood_avg": 3.9,   # InsightSummary 레코드 없으면 null
    "mood_after_cooldown_avg": 3.1,     # 쿨다운 레코드 없으면 null
    "risk_days_count": 3,
    "has_detailed_answers": True,        # 응답 JSON이 있는 체크인 존재 여부
    "correlation_insight": "갈등이 있는 날의 기분이 평소보다 1.5점 낮습니다"  # 데이터 부족 시 null
  }
  - 인수 조건:
    - 희소 데이터(7개 미만 체크인)에서도 유효한 통계 반환
    - 체크인이 없는 사용자를 우아하게 처리 (None/기본값 반환)
    - InsightSummary 레코드가 없는 사용자 처리 (기분 전용 데이터 반환, 상관관계 필드 null)
    - 90일 데이터에 대해 100ms 이내 연산 완료

  B2. AI에 기분 컨텍스트 주입 (A1 존재에 의존)

  - 수정 파일: backend/apps/core/services/user_intelligence.py (A1에서 생성)
  - 기능: 컨텍스트 스냅샷에 기분 상관관계 데이터 추가
  - 살균 처리 (CC2): 오늘의 체크인 메모/응답은 시스템 프롬프트에 주입되지 않음. 집계된 기분 숫자와 추세 라벨만.  
  - 추가되는 프롬프트 섹션 (리프레이밍 모드에만, 위로 모드에는 아님):
  ## 최근 기분 상태
  - 최근 7일 평균 기분: 3.2/5 (하락 추세)
  - 갈등이 있는 날 평균 기분: 2.4/5
  - 오늘 체크인 기분: 2/5
  - 인수 조건:
    - AI가 관련 시 기분 컨텍스트를 인정
    - 시스템 프롬프트에 원시 체크인 메모 없음 (기분 점수와 추세만)

  B3. 기분-패턴 상관관계 API 엔드포인트

  - 수정 파일: backend/apps/checkins/urls.py 및 새 뷰 함수
  - 새 엔드포인트: GET /api/v1/checkins/mood-insights/
  - 반환: 인증된 사용자에 대한 MoodPatternService 출력
  - 인수 조건:
    - 상관관계 데이터와 함께 200 반환
    - 체크인 없거나 InsightSummary 없는 사용자에게 빈/기본 데이터로 200 반환

  B4. 테스트 (신규)

  - 새 파일: backend/apps/checkins/tests/test_mood_correlation.py
  - 필수 테스트:
    - test_full_data_correlation() — 체크인과 인사이트가 있는 사용자
    - test_mood_only_no_insights() — 체크인은 있지만 InsightSummary 없는 사용자
    - test_no_checkins() — 기본값 반환
    - test_sparse_data() — 7개 미만 체크인
    - test_risk_day_detection() — 기분 < 3 + 에스컬레이션 > 5
    - test_answers_field_included() — 응답 JSON이 있는 체크인 처리

  ---
  워크스트림 C: 관계 건강 점수 (높은 우선순위)

  해결하는 갭: 갭 5 — 모든 구성 데이터가 있지만 복합 지표 없음
  의존성: B1 (MoodPatternService) 존재해야 하지만 스텁 사용 가능; A1 (UserIntelligenceService) 패턴 데이터용     
  예상 변경 파일 수: 5-6

  목표

  기분, 패턴, 참여도, 활동 데이터를 종합하여 하나의 실행 가능한 복합 관계 건강 점수(0-100)를 생성합니다.

  데이터 흐름

  DailyCheckIn.mood (가중치: 25%)
    + WeeklySummary의 escalation_trend (가중치: 25%)
    + Streak.current_streak + CoupleActivity 완료율 (가중치: 20%)
    + Pattern 심각도 추세 (가중치: 15%)
    + CoolDown 빈도 추세 (가중치: 15%)
    --> HealthScoreService.compute(user_id, couple_id=None)
    --> { score: 72, components: {...}, trend: "improving", insights: [...] }

  상세 태스크

  C1. HealthScoreService 생성

  - 새 파일: backend/apps/patterns/services/health_score.py
  - 계산 구성요소:
    a. 기분 구성요소 (0-25): 최근 14일 평균 기분, 스케일링. mood_avg * 5 = 원시, 25에서 상한
    b. 에스컬레이션 구성요소 (0-25): 평균 에스컬레이션의 역수. (10 - avg_escalation) * 2.5
    c. 참여 구성요소 (0-20): current_streak (점수화를 위해 7에서 상한 = 10점, 튜닝 파라미터로 문서화) +
  activity_completion_rate_30d (0-1 * 10점). 참고: CoupleActivity.rating에 범위 검증 없음 — max(0, min(5,        
  rating)) 방어적 클램프 사용.
    d. 패턴 심각도 구성요소 (0-15): 최근 30일 평균 패턴 심각도의 역수. (5 - avg_severity) * 3
    e. 쿨다운 구성요소 (0-15): 쿨다운 빈도 추세의 역수. 쿨다운이 적을수록 = 높은 점수. 이번 주 vs 지난 주 비교   
  - 솔로 사용자 처리 (CC3): couple_id가 None이거나 커플이 대기 중이면 개인 점수만 계산. "양쪽 파트너 데이터 평균"
   단계 건너뜀. 개인 점수를 개인 구성요소 최대값으로 제한.
  - 커플 수준 점수: 양쪽 파트너의 개인 점수 평균 — 커플이 활성 상태이고 양쪽 모두 데이터가 있을 때만.
  - 누락 데이터: 데이터가 없는 구성요소는 중립 점수: 최대값의 50% (버그가 아닌 설계 선택으로 문서화).
  - 추세: 현재 점수를 7일 전 점수와 비교
  - 튜닝 파라미터: 모든 매직 넘버(연속기록 상한=7, 가중치, 등급 임계값)를 파일 상단에 상수로 문서화하여 쉽게 조정
   가능.
  - 출력:
  {
    "score": 72,
    "grade": "양호",  # 0-30: 위험, 31-50: 주의, 51-70: 보통, 71-85: 양호, 86-100: 매우 좋음
    "trend": "improving",
    "is_couple_score": True,  # 솔로 사용자는 False
    "components": {
      "mood": {"score": 18, "max": 25, "detail": "평균 기분 3.6/5"},
      "escalation": {"score": 20, "max": 25, "detail": "평균 에스컬레이션 2.0/10"},
      "engagement": {"score": 14, "max": 20, "detail": "5일 연속 체크인, 활동 완료율 60%"},
      "patterns": {"score": 12, "max": 15, "detail": "패턴 심각도 평균 2.0/5"},
      "cooldown": {"score": 8, "max": 15, "detail": "이번 주 쿨다운 2회 (지난주 4회)"}
    },
    "insights": [
      "에스컬레이션 점수가 지난주보다 개선되었어요",
      "재정 관련 갈등이 3주 연속 나타나고 있어요"
    ]
  }
  - 인수 조건:
    - 점수는 0-100, 구성요소 합계 최대 100
    - 누락 데이터를 우아하게 처리 (데이터 없는 구성요소는 중립 점수)
    - 개인 및 커플 수준 점수 모두 지원
    - 솔로 사용자가 에러 없이 개인 전용 점수 수신
    - 인사이트가 한국어로 생성, 최대 3개
    - CoupleActivity.rating 방어적 클램프 적용

  C2. 건강 점수 API 엔드포인트

  - 새 파일: backend/apps/patterns/urls.py 및 backend/apps/patterns/views.py에 추가
  - 엔드포인트:
    - GET /api/v1/patterns/health-score/ — 현재 사용자의 건강 점수
    - GET /api/v1/patterns/health-score/history/ — 최근 30일 일별 점수
  - 인수 조건:
    - 모든 구성요소와 함께 현재 점수 반환
    - 히스토리 엔드포인트가 {date, score, grade} 객체 배열 반환

  C3. 일별 건강 점수 저장 (Celery 태스크)

  - 새 모델: patterns 앱의 DailyHealthScore
    - 필드: user, couple (솔로 사용자는 nullable), date, score, components (JSON), created_at
  - 새 Celery 태스크: compute_daily_health_scores — 매일 자정 KST에 실행
    - 활성 커플 + 최근 활동이 있는 솔로 사용자를 순회하며, 각 사용자의 점수를 계산하고 저장
  - 스케줄링: 기존 주간 요약 태스크가 config/celery.py의 app.conf.beat_schedule을 사용. 같은 패턴 따름:
  config/celery.py의 beat_schedule에 일별 건강 점수 태스크 추가. 또는 데이터 마이그레이션을 통해
  django_celery_beat의 PeriodicTask 테이블로 데이터베이스 기반 스케줄링 사용. 어느 방법이든 가능 — 기존 프로젝트 
  관례를 따를 것.
    - 수동 테스트를 위한 관리 명령어 python manage.py compute_health_scores 추가 (개발 환경에서
  CELERY_TASK_ALWAYS_EAGER=True이므로)
  - 마이그레이션: DailyHealthScore 모델 생성 + django_celery_beat를 통한 주기적 태스크 등록 단일 마이그레이션    
  파일
  - 인수 조건:
    - 태스크가 매일 실행되어 모든 활성 커플 + 솔로 활성 사용자의 점수 저장
    - 과거 점수가 추세 차트용으로 조회 가능
    - 수동 개발 테스트용 관리 명령어 존재

  C4. 테스트 (신규)

  - 새 파일: backend/apps/patterns/tests/test_health_score.py
  - 필수 테스트:
    - test_full_couple_score() — 활성 커플, 양쪽 파트너 데이터 있음
    - test_solo_user_score() — 활성 커플 없는 사용자
    - test_missing_component_neutral() — 데이터 없는 구성요소가 50% 중립 점수
    - test_score_bounds() — 점수가 항상 0-100
    - test_rating_clamp() — CoupleActivity.rating 범위 초과 처리
    - test_daily_task_stores_scores() — celery 태스크 통합 테스트

  ---
  워크스트림 D: 능동적 추천 엔진 (중간 우선순위)

  해결하는 갭: 갭 6 — 능동적 추천 없음
  의존성: A1 (UserIntelligenceService), C1 (HealthScoreService) — A & C 기반이 존재한 후 시작 가능
  예상 변경 파일 수: 5-7

  목표

  감지된 패턴, 기분 추세, 건강 점수 구성요소를 기반으로 활동, 프롬프트, 행동을 추천합니다.

  데이터 흐름

  HealthScoreService.compute() -- 약한 구성요소 식별
    + Pattern (최근 카테고리)
    + DailyCheckIn (기분 추세)
    + CoupleActivity (중복 방지를 위한 완료된 활동)
    + DailyPrompt (필요 카테고리에 맞는 가용 프롬프트)
    + UserProfile.communication_frequency --> 추천 빈도 게이팅
    --> RecommendationService.get_recommendations(user_id, couple_id)
    --> [ {type: "activity", item: {...}, reason: "..."}, {type: "prompt", ...} ]

  상세 태스크

  D1. RecommendationService 생성

  - 새 파일: backend/apps/activities/services/recommendations.py
  - 로직:
    a. C1에서 건강 점수 구성요소 가져옴
    b. 가장 약한 구성요소 식별 (최대값의 50% 미만)
    c. 약점을 추천 유형에 매핑:
        - 낮은 기분 점수 --> "감사" 카테고리 프롬프트, "데이트" 카테고리 활동 제안
      - 높은 에스컬레이션 --> 낮은 난이도의 "대화" 활동, 쿨다운 알림 제안
      - 낮은 참여도 --> 쉽고/짧은 활동, 연속기록 동기부여 제안
      - 반복 주제 (예: 재정) --> DailyPrompt에서 재정 관련 프롬프트 제안
    d. 이미 완료된 활동 필터링 (최근 14일)
    e. communication_frequency 게이팅: "rarely" 선호 사용자는 최대 2개 가벼운 추천; "daily"는 최대 5개;
  "weekly"는 3개.
    f. 관련성으로 순위 매기기, 상위 N개 반환 (communication_frequency 기준)
  - 솔로 처리 (CC3): 커플 특화 활동 추천 건너뜀. 개인 활동과 프롬프트만 제안.
  - 출력:
  [
    {
      "type": "activity",
      "item_id": 5,
      "title": "감사 일기 함께 쓰기",
      "reason": "최근 기분이 낮은 추세예요. 감사 표현이 기분 개선에 도움될 수 있어요.",
      "priority": "high"
    },
    {
      "type": "prompt",
      "item_id": 12,
      "title": "돈에 대해 서로 어떤 가치관을 가지고 있나요?",
      "reason": "재정이 반복 갈등 주제입니다. 평화로운 시간에 대화해보세요.",
      "priority": "medium"
    }
  ]
  - 인수 조건:
    - 한국어 사유와 함께 추천 반환
    - 추천 수가 communication_frequency 선호도를 준수
    - 7일 내 중복 추천 없음
    - 활동 이력이 없는 커플 처리 (추천/쉬운 항목 추천)
    - 사유가 구체적 데이터 포인트를 참조 (일반적인 "이것 해보세요"가 아님)

  D2. 추천 API 엔드포인트

  - 수정 파일: backend/apps/activities/urls.py 및 뷰
  - 엔드포인트: GET /api/v1/activities/recommendations/
  - 인수 조건:
    - 사유와 함께 개인화된 추천 반환
    - 사용자당 6시간 캐시 (체크인/활동 완료 시 무효화)

  D3. 스마트 데일리 프롬프트 선정

  - 수정 파일: backend/apps/prompts/ — 컨텍스트 인식 프롬프트 할당을 위한 서비스 로직 추가
  - 현재 상태: 프롬프트가 무작위로 할당됨 (today_prompt 뷰)
  - 새 로직: 데일리 프롬프트 할당 시 고려:
    a. 반복 갈등 주제 --> 매칭되는 카테고리의 프롬프트 선택
    b. 기분 추세 --> 하락 중이면 가벼운/감사 프롬프트; 안정적이면 깊은 프롬프트
    c. communication_frequency --> "rarely" 사용자는 부드러운 프롬프트
    d. 30일 내 프롬프트 반복 없음
  - 인수 조건:
    - 데일리 프롬프트 할당이 패턴과 기분 데이터를 고려
    - 프롬프트 카테고리 선택이 설명 가능 (사유와 함께 로깅)

  D4. 테스트 (신규)

  - 새 파일: backend/apps/activities/tests/test_recommendations.py
  - 필수 테스트:
    - test_low_mood_recommends_gratitude() — 약점을 올바른 유형에 매핑
    - test_communication_frequency_limits() — "rarely" 사용자가 최대 2개
    - test_no_duplicate_recommendations() — 7일 중복 제거
    - test_solo_user_recommendations() — 개인 전용 활동

  ---
  워크스트림 E: 쿨다운 분석 & 파트너 대시보드 (중간 우선순위)

  해결하는 갭: 갭 7 & 8 — 쿨다운 빈도 미분석; 파트너 수준 인사이트 부재
  의존성: 없음 (병렬 실행 가능)
  예상 변경 파일 수: 5-7

  목표

  쿨다운 사용을 에스컬레이션 신호로 추적하고, 커플 수준 비교 분석을 제공합니다.

  상세 태스크

  E1. 쿨다운 분석 서비스

  - 새 파일: backend/apps/cooldown/services/analytics.py
  - 기능:
    a. 최근 30일 사용자/커플의 CoolDown 레코드 쿼리
    b. 계산: 이번주_빈도, 지난주_빈도, 추세, 평균_지속시간, 완료율 (completed_at이 null 아닌 것 / 전체)
    c. 같은 날의 대화 에스컬레이션 점수와 상관 분석
    d. "쿨다운 클러스터" 식별 — 24시간 내 다중 쿨다운 = 높은 스트레스 날
  - 출력:
  {
    "total_30d": 8,
    "this_week": 2,
    "last_week": 4,
    "trend": "improving",
    "avg_duration_seconds": 480,
    "completion_rate": 0.75,
    "high_stress_days": ["2026-02-05", "2026-02-01"],
    "correlation_with_escalation": 0.72
  }
  - 인수 조건:
    - 3개 미만의 쿨다운 레코드에서도 유효한 분석 반환
    - 높은 스트레스 날이 올바르게 식별됨 (24시간 내 2회 이상 쿨다운)

  E2. 파트너 비교 대시보드 API

  - 새 파일: backend/apps/couples/services/partner_dashboard.py
  - 새 엔드포인트 backend/apps/couples/urls.py:
    - GET /api/v1/couples/dashboard/ — 커플 수준 분석
  - 프라이버시 보호 (CC2 + 아키텍트 #7): 모든 파트너 데이터 쿼리는 쿼리셋 수준 필터링 사용:
    - 각 파트너의 Pattern 쿼리는 user=requesting_user로 필터 — 파트너 패턴은 절대 로드되지 않음
    - 파트너 섹션은 다음만 표시: display_name, mood_avg, checkin_streak, conversation_count (집계 숫자만)        
    - 상대 파트너의 패턴 내용은 절대 표시되지 않음, 카테고리 횟수만
    - couple_features_enabled == False (CC1): 메시지와 함께 403 반환
  - 반환 내용:
  {
    "couple_health_score": 72,
    "my_stats": {
      "display_name": "...",
      "mood_avg_7d": 3.5,
      "checkin_streak": 5,
      "conversation_count_30d": 8,
      "top_patterns": [...]  # 자신의 패턴만
    },
    "partner_stats": {
      "display_name": "...",
      "mood_avg_7d": 4.0,
      "checkin_streak": 3,
      "conversation_count_30d": 5
      # 파트너의 패턴 내용 없음
    },
    "shared_metrics": {
      "activities_completed_together": 3,
      "prompts_both_answered": 7,
      "cooldowns_total": 6,
      "escalation_trend": "improving"
    }
  }
  - 솔로 처리 (CC3): 활성 커플이 없으면 개인 전용 대시보드 반환 (partner_stats 없음, shared_metrics 없음).       
  - 인수 조건:
    - 양쪽 파트너가 동일한 커플 수준 지표를 봄
    - 개인 패턴 내용이 상대 파트너에게 유출되지 않음 (쿼리셋 수준 격리)
    - 솔로 사용자가 개인 전용 대시보드 수신
    - couple_features_enabled == False이면 403 반환

  E3. 테스트 (신규)

  - 새 파일: backend/apps/couples/tests/test_partner_dashboard.py
  - 필수 테스트:
    - test_partner_data_isolation() — 파트너 A가 파트너 B의 패턴 내용을 볼 수 없음
    - test_couple_features_disabled() — 안전이 커플 기능 비활성화 시 403 반환
    - test_solo_user_dashboard() — 개인 전용 데이터 반환
    - test_shared_metrics_symmetric() — 양쪽 파트너가 동일한 공유 지표를 봄

  ---
  워크스트림 F: 활동 & 프롬프트 인텔리전스 피드백 루프 (낮은 우선순위)

  해결하는 갭: 갭 4 — 활동/프롬프트 데이터가 인텔리전스에 미사용
  의존성: C1 (HealthScoreService) 점수 영향 측정용
  예상 변경 파일 수: 4-5

  목표

  활동 완료 평가와 프롬프트 응답 데이터를 사용하여 효과를 측정하고 건강 점수 및 AI 컨텍스트에 피드백합니다.      

  상세 태스크

  F1. 활동 효과 추적

  - 수정 파일: backend/apps/activities/ — 서비스 추가
  - 기능:
    a. 활동 완료 + 평가 후, 다음 체크인에서 기분이 개선되었는지 확인
    b. 활동 유형별 효과 추적: {activity_category: avg_rating, mood_impact}
    c. 효과적인 활동 유형을 추천 엔진(D1)에 피드
  - DailyCheckIn.answers 향상: 활동 후 체크인에 answers JSON이 있으면, 응답 길이/수를 추가 참여 신호로 사용.     
  - 인수 조건:
    - 카테고리별 활동 효과 측정 가능
    - 높은 평가를 받은 활동이 추천에서 우선순위

  F2. 프롬프트 응답 분석

  - 새 파일: backend/apps/prompts/services/analysis.py
  - 기능:
    a. 양쪽 파트너가 데일리 프롬프트에 응답하면, 경량 감정 비교 실행
    b. 응답이 크게 다른 프롬프트(잠재적 긴장 지점) vs 일치하는 프롬프트(긍정적 지표) 식별
    c. 프롬프트 할당별 일치 점수 저장
  - 인수 조건:
    - 양쪽 파트너가 응답했을 때 일치 점수 계산
    - 결과가 커플 대시보드(E2)에서 조회 가능

  F3. 테스트 (신규)

  - 필수 테스트:
    - test_activity_effectiveness_tracking() — 활동 후 기분 영향 측정
    - test_prompt_alignment_both_responded() — 일치도 계산
    - test_prompt_alignment_one_responded() — 우아한 처리

  ---
  인프라 태스크 (신규 — 워크스트림 A 이전 또는 병행 필수)

  I1. Django 캐시 설정 추가 (A1 차단 요소)

  - 수정 파일: backend/config/settings/base.py
  - 추가:
  CACHES = {
      'default': {
          'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
          'LOCATION': 'unique-snowflake',
      }
  }
  - 프로덕션 오버라이드 production.py에서 Redis 사용 (channels/celery와 동일 인스턴스):
  CACHES = {
      'default': {
          'BACKEND': 'django.core.cache.backends.redis.RedisCache',
          'LOCATION': env('REDIS_URL', default='redis://localhost:6379/2'),
      }
  }
  - 캐시 무효화 전략: UserProfile, UserGoals, SafetyAssessment, Pattern, DailyCheckIn, Streak 모델 save/delete 시
   Django 시그널. 시그널 핸들러가 cache.delete(f'user_intelligence:{user.id}') 호출.

  I2. 데이터베이스 인덱스 마이그레이션 (CC6)

  - 새 마이그레이션 파일 (RunSQL을 사용한 관련 앱 간 단일 마이그레이션):
    - Pattern(user, pattern_type, created_at) 복합 인덱스
    - InsightSummary(user, created_at) 복합 인덱스
    - CoolDown(user, created_at) 인덱스 (없을 경우)

  ---
  구현 우선순위 & 병렬화

  0주차 (선행 조건):
    [I1] Django 캐시 설정        <-- A1 차단 요소
    [I2] 데이터베이스 인덱스 마이그레이션  <-- 병렬 가능

  1-2주차 (병렬):
    [워크스트림 A] 개인화 AI 컨텍스트     <-- 최고 가치, 가장 큰 영향
    [워크스트림 B] 기분-패턴 상관관계     <-- 독립적, 높은 가치
    [워크스트림 E] 쿨다운 + 파트너 대시보드  <-- 독립적

  2-3주차 (A+B 기반 이후 병렬):
    [워크스트림 C] 건강 점수              <-- B1, A1에 의존
    [워크스트림 D] 추천                  <-- A1, C1에 의존

  3-4주차:
    [워크스트림 F] 활동/프롬프트 피드백    <-- C1, D1에 의존

  의존성 그래프

  I1 (캐시 설정) -----> A1 (UserIntelligenceService)
                         |
                         +--> A2 (프롬프트 빌더) --> A3 (리프레이밍 연결)
                         |                       --> A3b (위로 연결)
                         +--> B2 (AI 컨텍스트에 기분)
                         +--> C1 (건강 점수)
                         +--> D1 (추천)

  (독립) B1 (기분 상관관계) --> B2, B3
  (독립) E1 (쿨다운 분석) --> E2 (대시보드)
  (독립) I2 (인덱스)

  C1 --> C2, C3
  C1, A1 --> D1 --> D2, D3
  C1 --> F1, F2

  파일 영향 요약
  ┌──────────────────────────────────────────┬────────────┬──────────────────────────────┐
  │                   파일                   │ 워크스트림 │          변경 유형           │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ config/settings/base.py                  │ I1         │ 수정 (CACHES 추가)           │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ config/settings/production.py            │ I1         │ 수정 (Redis 캐시)            │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ core/services/user_intelligence.py       │ A, B       │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ core/tests/test_user_intelligence.py     │ A          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ chat/prompts/system_prompts.py           │ A          │ 수정 (빌더 함수 추가)        │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ chat/services/reframing_graph.py         │ A          │ 수정 (user_context 수용)     │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ chat/views.py                            │ A          │ 수정 (user_context 전달)     │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ checkins/services/mood_correlation.py    │ B          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ checkins/tests/test_mood_correlation.py  │ B          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ checkins/urls.py + views                 │ B          │ 수정                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ patterns/services/health_score.py        │ C          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ patterns/tests/test_health_score.py      │ C          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ patterns/models.py                       │ C          │ 수정 (DailyHealthScore 추가) │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ patterns/tasks.py                        │ C          │ 수정 (일별 태스크 추가)      │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ patterns/urls.py + views                 │ C          │ 수정                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ activities/services/recommendations.py   │ D          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ activities/tests/test_recommendations.py │ D          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ activities/urls.py + views               │ D          │ 수정                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ prompts/services/                        │ D, F       │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ cooldown/services/analytics.py           │ E          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ cooldown/urls.py + views                 │ E          │ 수정                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ couples/services/partner_dashboard.py    │ E          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ couples/tests/test_partner_dashboard.py  │ E          │ 신규                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ couples/urls.py                          │ E          │ 수정                         │
  ├──────────────────────────────────────────┼────────────┼──────────────────────────────┤
  │ 마이그레이션 파일                        │ I2, C      │ 신규 (2-3개 마이그레이션)    │
  └──────────────────────────────────────────┴────────────┴──────────────────────────────┘
  가드레일

  필수 사항

  - 안전 게이트 (CC1): 고위험 사용자는 최소/무개인화. couple_features_enabled 준수.
  - 프롬프트 인젝션 보호 (CC2): 시스템 프롬프트에 원시 사용자 텍스트 없음. 모든 사용자 파생 콘텐츠에 살균 함수   
  적용.
  - 솔로 사용자 지원 (CC3): 모든 서비스가 couple=None / pending 상태 처리.
  - Sync/async 경계 (CC4): UserIntelligenceService가 비동기 파이프라인 진입 전 뷰에서 동기적으로 호출.
  - 암호화 필드 안전 (CC5): 캐시에 복호화된 ai_summary나 trend_text 없음.
  - 모든 신규 서비스가 데이터 누락 시 우아한 저하
  - 기존 API 계약에 호환 파괴 없음
  - 모든 프롬프트가 토큰 예산 내 유지 (새 섹션 < 700 토큰)
  - 파트너 데이터 프라이버시 보존 (쿼리셋 수준 필터링, 파트너 간 패턴 내용 교차 없음)
  - 모든 사용자 대면 텍스트 한국어
  - 모든 신규 엔드포인트 인증 필요
  - 워크스트림별 테스트, 안전 핵심 경로 커버

  절대 불가 사항

  - 기존 모델에 데이터베이스 스키마 변경 없음 (추가만)
  - 안전/위기 감지 파이프라인 변경 없음
  - 기존 프롬프트 텍스트 제거 또는 구조 변경 없음
  - 이 계획에 프론트엔드/모바일 변경 없음 (백엔드만)
  - LLM 공급자 설정 변경 없음
  - 프롬프트에 하드코딩된 사용자 데이터 없음 (모두 DB에서 동적)
  - 새로운 스케줄링 메커니즘 없음 — config/celery.py의 기존 beat_schedule 패턴 따름

  성공 기준

  1. 개인화 테스트: 서로 다른 프로필(고불안 vs 저불안)을 가진 두 사용자가 동일한 갈등 메시지에 대해 측정 가능하게
   다른 AI 응답을 받음
  2. 안전 테스트: 고위험 사용자가 AI 컨텍스트에서 트리거 문구나 에스컬레이션 데이터를 전혀 받지 않음
  3. 패턴 인식 테스트: "돈" 주제를 5회 논의한 사용자가 이것이 반복 주제임을 인정하는 AI 응답을 받음 (사용자의    
  말을 인용하지 않고 카테고리로)
  4. 건강 점수 테스트: 점수가 커플의 참여 수준을 정확히 반영 — 좋은 기분의 활발한 커플은 > 70점, 높은
  에스컬레이션의 비활성 커플은 < 40점. 솔로 사용자가 유효한 개인 점수 수신.
  5. 추천 관련성 테스트: 추천이 구체적 데이터 포인트를 사유로 제시하고 communication_frequency 선호도를 준수     
  6. 대시보드 테스트: 양쪽 파트너가 일관된 커플 수준 지표를 보면서 개인 패턴 데이터는 비공개 유지 (쿼리셋 수준   
  검증)
  7. 위로 모드 테스트: 위로 파이프라인이 애착/기분 컨텍스트를 포함하되 모든 갈등/패턴 데이터를 제외
  8. 테스트 스위트: 모든 신규 서비스가 정상 경로, 엣지 케이스, 안전 게이트, 솔로 사용자 시나리오를 커버하는 단위 
  테스트 보유