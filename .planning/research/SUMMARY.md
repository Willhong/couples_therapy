# Project Research Summary

**Project:** CouplesAI - AI-based Couples Therapy Mobile App
**Domain:** Mental health tech / AI-powered relationship counseling
**Researched:** 2026-01-23
**Confidence:** HIGH

## Executive Summary

CouplesAI is an AI-powered couples therapy mobile app centered on a unique value proposition: real-time conflict reframing to help partners understand each other's perspectives. This type of product sits at the intersection of mental health apps (like Headspace, Calm) and relationship tools (like Paired, Lasting), but with a critical differentiator - using AI to reframe conflicts during or immediately after they occur, rather than providing generic communication exercises.

The recommended approach is a privacy-first React Native (Expo) mobile app with Supabase backend, leveraging Claude for nuanced emotional reframing and Whisper for audio transcription. The architecture must prioritize three non-negotiable aspects: (1) security architecture designed from day one to handle highly sensitive relationship data, (2) abuse screening to avoid enabling abusive relationships, and (3) non-judgmental AI analysis that never "takes sides" to avoid the Reddit pain point of feeling judged. The technical stack is mature and well-documented, with Expo SDK 53+ providing stable audio recording via expo-audio and comprehensive tooling for mobile development.

The primary risk is not technical - it's ethical and legal. Unlike typical SaaS apps, mistakes here can destroy marriages, enable abuse, or violate wiretapping laws. The research identified 13 distinct pitfalls, with 5 rated as critical (could cause user harm or legal liability). Success requires building the legal/ethical foundation first (abuse screening, recording consent, data security) before implementing AI features. The core reframing feature must be designed to validate emotions first, present multiple perspectives without judgment, and explicitly avoid the thin line between therapeutic reframing and gaslighting.

## Key Findings

### Recommended Stack

The technology stack is optimized for privacy-critical AI therapy with audio recording. Modern React Native development in 2025 centers on Expo as the de-facto framework (74.6% adoption of New Architecture), with expo-audio being the only stable audio recording solution after expo-av's deprecation in SDK 53. The combination of Supabase (PostgreSQL with Row-Level Security) and Anthropic Claude API represents best practices for handling sensitive relationship data while delivering nuanced emotional understanding.

**Core technologies:**

- **Expo SDK 53+** (React Native 0.79, React 19.x): De-facto standard framework with New Architecture enabled by default. Critical for expo-audio stability and EAS Build/Submit automation. TypeScript 5.x essential for complex therapy logic.

- **expo-audio**: New stable API replacing deprecated expo-av. Only reliable cross-platform audio recording solution for React Native in 2025. Supports HIGH_QUALITY presets optimized for Whisper transcription.

- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions): BaaS optimized for relational therapy data with Row-Level Security policies. Offers HIPAA BAA for healthcare compliance, encrypted storage for audio files, and server-side LLM integration via Edge Functions to keep API keys secure.

- **Anthropic Claude API** (claude-3.5-sonnet or claude-3-opus): Best-in-class for nuanced emotional/relationship understanding and perspective-taking. Streaming support enables real-time feedback UX. Superior to GPT-4 for therapeutic reframing contexts.

- **OpenAI Whisper API** (gpt-4o-transcribe): Cost-effective transcription at $0.006/min with speaker diarization. 4x cheaper than Google Cloud STT with comparable accuracy.

- **NativeWind v4.1+** (Tailwind for React Native): Build-time compiled styling with no runtime overhead. Includes theming for dark mode support (important for therapy app UX).

- **Zustand 5.x + TanStack Query v5**: Client state and server state separation. Handles React concurrency correctly, minimal boilerplate. Critical: never store sensitive therapy data in AsyncStorage-persisted Zustand - use expo-secure-store for PII/PHI.

- **expo-secure-store**: Native keychain/keystore encryption for auth tokens and sensitive metadata. iOS Keychain and Android EncryptedSharedPreferences provide hardware-backed security.

**Version compatibility:** Expo SDK 53 ships with React 19.x (breaking changes from v18) and React Native 0.79. NativeWind v4.1 is stable; v5 is in preview. All documentation is current as of January 2025.

### Expected Features

The couples therapy app market reveals a clear white space: no competitor centers on conflict-moment intervention with perspective reframing. Paired (8M downloads) focuses on daily questions, Lasting provides structured Gottman-based learning, and Maia does audio analysis, but none address the core need of understanding partner perspective during actual conflicts.

**Must have (table stakes):**

- **Secure account with partner linking** - Both partners need separate accounts that sync. Apps like Paired lock answers until both respond to prevent bias. Missing this makes the app feel incomplete.

- **Privacy & data security** - AI therapy raises major privacy concerns. Users expect HIPAA-adjacent protections even though most apps aren't covered. Encryption, secure storage, and clear data policies are non-negotiable.

- **Daily engagement mechanism** - Paired's 5-min/day model and streak mechanics drive 22% retention improvement. Lightweight daily touchpoints prevent abandonment.

- **Basic communication exercises** - Every competitor has question prompts and conversation starters. Missing this signals lack of relationship expertise.

- **Progress tracking** - Health/wellness app standard. Users expect visual progress, completion tracking, and relationship health indicators.

- **Onboarding assessment** - Relationship baseline, attachment styles, love languages. Sets personalization foundation.

**Should have (competitive differentiators):**

- **Conflict-moment reframing AI** - OUR CORE DIFFERENTIATOR. Help users see partner's perspective during/after conflict. Addresses "judgment" pain point that no competitor solves.

- **AI-generated perspective narrative** - Generate "how your partner might be feeling" explanations based on conflict input. Direct delivery of core value prop.

- **Conflict pattern recognition** - Identify recurring themes across multiple arguments. Maia does this with 1hr/week free analysis.

- **Cool-down facilitation** - Guided 10-min break during heated moments. Research shows planned pauses cut escalation by 50%.

- **Non-judgmental framing** - AI positioned as neutral third party that presents both perspectives, never takes sides. Addresses Reddit pain point.

**Defer (v2+):**

- **Voice/audio analysis of arguments** - High complexity (tone analysis, interruption detection, emotional spikes). Donkey Chats and Maia offer this but it's not essential for MVP validation.

- **Real-time text tone checking** - Donkey Chats scans messages before sending. High complexity, narrow use case.

- **Emergency escalation path** - Crisis detection with therapist referral. Important but requires partnerships and complex detection logic.

**Anti-features (explicitly exclude):**

- **"Who's right" determination** - ArgueResolver tries this; increases adversarial dynamics. Focus on understanding, not winning.

- **Sycophantic validation** - AI tendency to agree prevents seeking real help. Must challenge gently and present both perspectives.

- **Individual-only usage encouraging secrecy** - Using AI secretly damages trust between partners. Design for transparency.

- **Replacing human therapy claims** - Legal/ethical issues. Position as "supplement" or "between sessions" tool.

### Architecture Approach

AI couples therapy apps are structured around four core domains: (1) secure user data management with partner linking, (2) audio capture and transcription, (3) AI-powered conversation analysis and reframing, and (4) privacy-first data handling. The architecture must balance real-time responsiveness (< 3 seconds for text analysis, < 30 seconds for 5-minute audio) with robust security for highly sensitive relationship data that could destroy marriages if breached.

**Major components:**

1. **Mobile Client (React Native + Expo)** - Audio recording via expo-audio, local encryption before upload, chat interface for text-based logging, partner linking via pairing codes, offline support with queue sync, secure token storage via expo-secure-store.

2. **API Gateway** - JWT authentication, rate limiting (especially for expensive AI endpoints), request routing to microservices, TLS 1.3 termination for all traffic.

3. **Auth Service** - Email/OAuth registration (Google, Apple), JWT issuance and validation, partner linking via 6-digit pairing codes (expires 10 min), sharing preferences management.

4. **User Service** - Profile management, partnership data, sharing preferences (none/analysis-only/full), subscription tier tracking (free/premium).

5. **Audio Service** - Encrypted audio upload and storage in S3, transcription orchestration via Whisper API, audio cleanup after configurable retention (default 7 days).

6. **Analysis Service (Core AI)** - Speaker diarization (who said what), sentiment analysis per speaker, reframing generation ("what partner might have heard"), action suggestions. Uses GPT-4o for complex perspective-taking, GPT-4o-mini for cost-effective sentiment.

7. **Sharing Service** - Permission management (what each partner can see), shared view compilation, notification when new shared content available.

**Data flow architecture:**
- Text input: Client -> API Gateway -> Analysis Service -> LLM -> PostgreSQL -> Client (< 3s target)
- Audio input: Client -> Audio Service -> S3 -> Whisper API -> Analysis Service -> LLM -> PostgreSQL -> Client (< 30s for 5-min audio)
- Partner viewing: Client -> Sharing Service (verify partnership, check permissions, filter data) -> Client

**Database design:** PostgreSQL with Row-Level Security (RLS) for fine-grained access control. Core tables: users, partnerships, entries (text/audio), analyses (sentiment + reframing + suggestions), partner_notes. Field-level encryption for sensitive content. PostgreSQL chosen over MongoDB for strong relationships (users-partnerships-entries-analyses), RLS for HIPAA-grade isolation, and proven security track record.

**Security layers:** Transport (TLS 1.3), Storage (AES-256), Application (field-level encryption for transcripts/notes), Client (platform encryption for local storage). Zero-trust principles: every request authenticated, every endpoint authorized, every action logged, minimum necessary data access.

### Critical Pitfalls

The research identified 13 pitfalls across three severity levels. The top 5 critical pitfalls could cause user harm or legal liability:

1. **Enabling Abuse Through "Neutral" Therapy** - Treating both partners equally in abusive relationships gives abusers tools to manipulate victims. Couples therapy assumes power balance; neutrality in abuse equals enabling. National Domestic Violence Hotline explicitly recommends against couples therapy with abusers. Prevention: abuse screening before couples features activate, individual-only mode that doesn't share with partner, clear disclaimers, never frame abuse as "communication problems". Detection: one partner always "wrong", extreme emotional language patterns, controlling app usage. Address in Phase 1 (non-negotiable safety feature).

2. **Audio Recording Legal Liability** - Recording conversations in two-party consent states without proper consent violates wiretapping laws. 12+ US states require all-party consent. Federal Wiretap Act creates criminal liability for interstate violations. 2025 class action lawsuits against AI recording tools demonstrate active legal risk. Prevention: explicit in-app consent from BOTH partners before any recording, location-based stricter law application, clear recording indicator that cannot be hidden, consent records with timestamps. Consider not allowing live conversation recording - only post-hoc journaling. Address in Phase 1 (legal architecture must be correct from day one).

3. **AI "Judges" Creating the "Referee" Problem** - Users perceive AI analysis as determining who is "right" or "wrong". Partner who feels judged disengages. App becomes weapon in arguments ("See? Even the AI says you're wrong!"). LLMs have documented bias in relationship advice. Prevention: never assign blame/fault/sides, frame insights as "perspectives" not "truth", show BOTH partners' valid concerns in every analysis, avoid numerical scores on conflicts, explicit "This is not a judgment" statements. Address in Phase 2 (must be designed into analysis feature from start).

4. **Reframing Becoming Gaslighting** - Core reframing feature can invalidate legitimate feelings if not carefully designed. Thin line between therapeutic reframing and gaslighting. Reframing without validation is experienced as dismissal. LLMs documented to gaslight users as emergent behavior. Prevention: ALWAYS validate emotion before offering reframe ("Your frustration makes sense because..."), present reframes as additional perspectives not replacements, allow users to reject reframes, never suggest emotions are "wrong", include "This doesn't mean your feelings aren't valid", offer choice between exploring perspective or just being heard. Address in Phase 2 (central to reframing feature design).

5. **Catastrophic Data Breach of Intimate Content** - Recorded arguments and relationship vulnerabilities are extraordinarily sensitive. 2025 AI companion apps leaked 400K+ users' intimate conversations. Unlike typical breaches, this content can destroy marriages, enable blackmail, cause divorces. Couples therapy data includes admissions of affairs, abuse, financial secrets. Prevention: end-to-end encryption with zero-knowledge architecture, minimize retention (delete recordings after analysis), never store unencrypted transcripts, SOC 2 Type II certification, on-device processing for sensitive analysis, no third-party analytics on content, clear data deletion on user request. Address in Phase 1 (security architecture designed in, not added later).

**Moderate pitfalls (cause churn/poor outcomes):**
- Reluctant partner problem (one partner refuses to participate)
- Triangulation and over-reliance (app becomes substitute for real communication)
- AI hallucination and fabrication (false advice or misquoted partner's words)
- Sentiment analysis false positives (misreading tone, sarcasm, cultural context)
- Regulatory compliance failure (practicing therapy without license, new AI mental health laws)

**Phase-specific warnings:**
- Phase 1 (Foundation): Abuse screening, recording consent, data security, regulatory positioning
- Phase 2 (Core Features): Judging/referee problem, reframing vs gaslighting, sentiment accuracy, hallucination prevention
- Phase 3 (Engagement): Reluctant partner engagement, triangulation, notification design
- Phase 4 (Scale): Cultural localization, expectation management

## Implications for Roadmap

Based on research, the recommended build sequence must prioritize ethical/legal foundation before AI features. The architecture dependencies and pitfall research strongly suggest a 5-phase approach:

### Phase 1: Legal & Ethical Foundation

**Rationale:** Cannot build any user-facing features without solving critical safety and legal requirements first. Abuse screening, recording consent, and data security must be architected from day one - retrofitting is impossible. Research shows 5 critical pitfalls that must be addressed in Phase 1 to avoid user harm and legal liability.

**Delivers:**
- User authentication and account management
- Partner linking via pairing codes
- Abuse screening before couples features activate
- Recording consent system with location-based legal compliance
- Data security architecture (encryption layers, secure storage)
- Privacy policy and regulatory positioning (not "therapy")
- Basic user profiles and partnership data model

**Addresses (from FEATURES.md):**
- Secure account with partner linking (table stakes)
- Privacy & data security (table stakes)

**Uses (from STACK.md):**
- Expo SDK 53+ for mobile framework
- Supabase Auth for authentication
- expo-secure-store for token storage
- PostgreSQL with Row-Level Security
- Supabase Edge Functions for server-side logic

**Avoids (from PITFALLS.md):**
- Pitfall #1: Enabling abuse through neutral therapy
- Pitfall #2: Audio recording legal liability
- Pitfall #5: Catastrophic data breach
- Pitfall #10: Regulatory compliance failure

**Research flag:** Legal requirements for Korean market (PIPA compliance, recording consent laws) need validation during planning.

### Phase 2: Core Reframing (Text-Only)

**Rationale:** Prove core value proposition (AI reframing for perspective understanding) before adding audio complexity. Text recording is simpler than audio but validates the fundamental product hypothesis. Architecture research shows text analysis builds foundation for later audio pipeline. Must address critical AI design pitfalls (#3 and #4) in this phase.

**Delivers:**
- Chat interface for logging conflict situations
- AI reframing engine (perspective generation)
- Non-judgmental analysis that presents both viewpoints
- Validation-first approach to avoid gaslighting
- Conflict history and pattern recognition
- Basic progress tracking

**Addresses (from FEATURES.md):**
- Conflict-moment reframing AI (core differentiator)
- AI-generated perspective narrative (core differentiator)
- Conflict pattern recognition (should have)
- Progress tracking (table stakes)

**Uses (from STACK.md):**
- Anthropic Claude API (claude-3.5-sonnet) for reframing
- Supabase Edge Functions to keep API keys server-side
- Zustand for client state
- TanStack Query for server state
- PostgreSQL for entries and analyses

**Avoids (from PITFALLS.md):**
- Pitfall #3: AI "judges" creating referee problem
- Pitfall #4: Reframing becoming gaslighting
- Pitfall #8: AI hallucination and fabrication
- Pitfall #9: Sentiment analysis false positives

**Research flag:** Prompt engineering for non-judgmental reframing needs iteration. Cultural adaptation for Korean communication styles (indirect expression, nunchi) needs deeper research.

### Phase 3: Audio Pipeline

**Rationale:** Audio recording adds major value (analyze actual arguments) but requires complex pipeline (recording, upload, transcription, diarization). Builds on stable analysis infrastructure from Phase 2. Architecture research shows this is highest-complexity component due to expo-audio integration, Whisper API, and speaker diarization.

**Delivers:**
- Audio recording via expo-audio
- Encrypted upload to Supabase Storage
- Whisper API transcription with speaker labels
- Enhanced analysis with audio sentiment
- Audio retention policies (auto-delete after 7 days)
- Offline recording with sync queue

**Addresses (from FEATURES.md):**
- Voice input for conflict description (should have)
- Deferred: Full audio analysis with tone/interruptions (v2+)

**Uses (from STACK.md):**
- expo-audio (HIGH_QUALITY preset for Whisper)
- expo-file-system for file handling
- OpenAI Whisper API (gpt-4o-transcribe) with speaker diarization
- Supabase Storage with signed URLs
- Enhanced Analysis Service for speaker-separated sentiment

**Avoids (from PITFALLS.md):**
- Pitfall #2: Recording consent enforcement (built in Phase 1, tested here)
- Pitfall #9: Sentiment false positives (especially with sarcasm/cultural context)

**Research flag:** Whisper API speaker diarization accuracy for couple conflicts (overlapping speech, emotion) needs validation. expo-audio configuration for optimal transcription quality needs testing.

### Phase 4: Partner Features & Engagement

**Rationale:** Partner features require stable individual experience first. Sharing logic is complex (permission levels, privacy controls) and builds on all previous components. Engagement features (daily prompts, notifications) help retention but aren't core value. Architecture research shows this as final piece of core feature set.

**Delivers:**
- Sharing Service (none/analysis-only/full permission levels)
- Shared view compilation for both partners
- Daily engagement prompts and questions
- Push notifications (carefully designed to avoid conflict)
- Streak tracking and gamification
- Communication exercise library

**Addresses (from FEATURES.md):**
- Daily engagement mechanism (table stakes)
- Basic communication exercises (table stakes)
- Onboarding assessment (table stakes)

**Uses (from STACK.md):**
- Sharing Service component from architecture
- Push notification system
- Content library storage in PostgreSQL
- NativeWind theming for polished UX

**Avoids (from PITFALLS.md):**
- Pitfall #6: Reluctant partner problem (design valuable solo mode)
- Pitfall #7: Triangulation and over-reliance (usage limits, real-world prompts)
- Pitfall #11: Notification design causing conflict

**Research flag:** Engagement mechanics that work for both enthusiastic and reluctant partners need UX research. Balance between encouraging usage and avoiding over-reliance.

### Phase 5: Production Hardening & Scale

**Rationale:** Polish and security hardening after core features are stable. Premium features, advanced analytics, and scale optimizations can wait until product-market fit is proven. This phase prepares for growth and potential HIPAA certification.

**Delivers:**
- Enhanced audit logging for all PHI access
- Crisis detection and escalation system
- SOC 2 Type II certification preparation
- Advanced pattern recognition and insights
- Premium tier features (on-device transcription for privacy)
- Performance optimization (read replicas, caching)
- Localization for Korean market

**Addresses (from FEATURES.md):**
- Emergency escalation path (deferred to post-MVP)
- Advanced features (pattern insights, premium tiers)

**Uses (from STACK.md):**
- Redis for caching and rate limiting
- Read replicas for PostgreSQL at scale
- On-device whisper.cpp for privacy-focused premium tier
- EAS Build and EAS Submit for production deployment

**Avoids (from PITFALLS.md):**
- Pitfall #12: Onboarding creating false expectations
- Pitfall #13: Cultural mismatch in communication styles

**Research flag:** HIPAA compliance requirements and BAA with Supabase need legal review. Korean mental health app regulations need investigation.

### Phase Ordering Rationale

**Why this order:**
1. Legal/ethical foundation must come first - cannot retrofit abuse screening or recording consent
2. Text reframing proves core value before audio complexity
3. Audio builds on stable analysis infrastructure from Phase 2
4. Partner features require stable solo experience first
5. Production hardening waits until product-market fit proven

**Dependency chain:**
- Auth Service → Analysis Service → Audio Service → Sharing Service
- Security architecture → AI features → Partner collaboration → Scale optimization
- Compliance framework → Core features → Engagement mechanics → Advanced features

**Pitfall avoidance:**
- Phase 1 addresses all 5 critical pitfalls' architectural requirements
- Phase 2 addresses core AI design risks (#3, #4) before adding audio
- Phase 3 validates recording consent system under real usage
- Phase 4 handles engagement and partner dynamics after core value proven

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1:** Korean legal requirements (PIPA compliance, recording consent laws differ from US), specific abuse screening protocols validated for digital context, partnership models with licensed professionals for regulatory coverage

- **Phase 2:** Prompt engineering patterns for non-judgmental reframing, cultural adaptation of reframing techniques for Korean communication norms (indirect expression, nunchi, hierarchical dynamics)

- **Phase 3:** Whisper API accuracy with overlapping speech/high emotion, expo-audio optimal configuration for transcription quality, on-device transcription feasibility (whisper.cpp) for premium privacy tier

- **Phase 5:** HIPAA BAA process with Supabase, SOC 2 Type II certification requirements, Korean mental health app regulations and licensing

**Phases with standard patterns (likely skip detailed research-phase):**

- **Phase 4:** Notification systems, streak mechanics, content libraries are well-documented engagement patterns with abundant references in mainstream apps

- **General:** Expo + Supabase integration, React Native state management, PostgreSQL schema design all have extensive official documentation and proven patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations based on official Expo SDK 53 docs, Supabase official guides, and authoritative 2025 React Native resources. Version compatibility verified. expo-audio migration from expo-av is well-documented. |
| Features | MEDIUM-HIGH | Table stakes identified from competitor analysis (Paired, Lasting, Maia) with user counts and reviews. Differentiator validated by market gap research - no competitor focuses on conflict-moment reframing. Anti-features grounded in documented failures. |
| Architecture | HIGH | Component structure based on mental health app development guides, HIPAA compliance resources, and official OpenAI/Anthropic API docs. PostgreSQL RLS for therapy data is proven pattern. Build order validated against dependency graph. |
| Pitfalls | HIGH | All critical pitfalls supported by documented incidents: 2025 AI recording lawsuits, Character.AI settlement, AI companion app breaches, National Domestic Violence Hotline guidelines, research on therapy making abuse worse. Legal risks verified via multiple law firm publications. |

**Overall confidence:** HIGH

Research quality is strong due to:
- Official documentation for all core technologies (Expo, Supabase, Claude, Whisper)
- Multiple independent sources confirming critical pitfalls (legal, ethical, user safety)
- 2025/2026 sources ensuring currency (Expo SDK 53, new AI regulations)
- Cross-validation of recommendations across STACK/FEATURES/ARCHITECTURE alignment

### Gaps to Address

**Technical gaps:**
- Korean market PIPA compliance specifics need legal consultation - research found general Korean privacy law but not therapy app precedents
- On-device whisper.cpp integration effort unclear - found references to React Native ports but no production case studies
- expo-audio optimal recording configuration for Whisper transcription needs empirical testing - documentation exists but conflict-specific settings untested

**Domain gaps:**
- Abuse screening protocols for digital-first context - found guidance for human therapists but digital adaptation unclear. May need consultation with domestic violence experts for implementation.
- Cultural adaptation depth for Korean market - research identified indirect communication (nunchi) as critical but specific prompt engineering patterns need development with Korean relationship counselors
- Crisis detection thresholds and response protocols - found that app should detect crisis but specific keyword lists and intervention flows need expert validation

**Regulatory gaps:**
- Korean mental health app licensing requirements - research found US state-by-state variations (Illinois 2025 law, etc.) but Korean regulatory landscape needs investigation
- HIPAA applicability for couples therapy apps - Supabase offers BAA but unclear if app qualifies as "covered entity" vs. personal wellness. Legal review needed.

**How to handle during planning/execution:**
- Phase 1 planning: Engage legal counsel for Korean recording consent and PIPA compliance before finalizing auth architecture
- Phase 2 planning: Partner with licensed therapist or relationship counselor for abuse screening protocol and crisis detection validation
- Phase 2-3 execution: Pilot with small user group to validate reframing prompts and sentiment analysis accuracy before scaling
- Phase 5 planning: Consult Korean relationship experts for cultural localization of reframing techniques

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- Expo SDK 53 Changelog and expo-audio documentation
- Supabase React Native Guide and Row-Level Security docs
- Anthropic SDK GitHub and Claude API documentation
- OpenAI Whisper API documentation and pricing
- NativeWind installation and configuration guides
- TanStack Query React Native offline support documentation

**Legal and Regulatory:**
- Reed Smith: Legality of AI-powered Recording and Transcription (2025)
- National Law Review: AI Recording Wiretap Lawsuits (2025)
- Brown University: AI Chatbots Violate Mental Health Ethics Standards (2025-10-21)
- Manatt Health: State AI Legislation Tracker (2025)
- The National Domestic Violence Hotline: Couples Therapy with Abusers

### Secondary (MEDIUM confidence)

**Industry Research:**
- React Native Tech Stack 2025 - Galaxies.dev
- Supabase vs Firebase 2025 - Zapier
- OpenAI Whisper API Pricing Analysis - BrassTranscripts
- Mental Health App HIPAA Compliance - SecurePrivacy
- LLM Integration Mobile Apps 2025 - TheUsefulApps

**Competitor Analysis:**
- Paired App Store (8M+ downloads)
- Lasting App Review - Choosing Therapy
- Maia - Why Recording Fights Helps Relationships
- Donkey Chats - Top 10 Relationship Apps
- Gottman Connect Platform documentation

**Architecture References:**
- Mental Health App Development Guide 2026 - TopFlight Apps
- HIPAA Compliant App Development 2025 - AppInventiv
- HIPAA Compliant Mobile Apps 2026 - OpenForge
- PostgreSQL vs MongoDB 2025 - Xenoss
- Building a Relationship App Guide - DHiWise
- MIND-SAFE Framework for Mental Health Chatbots - JMIR Mental Health

### Tertiary (LOW-MEDIUM confidence)

**User Safety and Documented Harm:**
- Psychology Today: Emotional Abuse - How Your Couples Counseling Made It Worse (2019)
- Character.AI Settlement - CNN (2026-01-07)
- Carey Center: Why AI Can't Fix Your Love Life and Could Make It Worse
- Talkspace: AI Couples Therapy Triangulation Concerns
- Psychology Today: AI Gaslighting Patterns (2025-07)

**Data Security Incidents:**
- Cybernews: AI Companion App Breach - 400K Users Exposed (2025)
- Private Internet Access: Mental Health App Privacy Dangers
- Heartland Dental AI Recording Lawsuit (July 2025)

**Engagement and UX:**
- Couples Therapy Inc: Partner Resistance Guide
- Psychotherapy Networker: When One Partner Won't Budge
- Storyly: Gamification Strategies for App Engagement
- Sentiment Analysis Limitations - AI Multiple, Toptal

---

*Research completed: 2026-01-23*
*Ready for roadmap: yes*
