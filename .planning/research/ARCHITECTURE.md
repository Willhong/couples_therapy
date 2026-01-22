# Architecture Patterns: AI Couples Therapy Mobile App

**Domain:** AI-powered couples therapy / relationship counseling mobile app
**Researched:** 2026-01-23
**Confidence:** HIGH (based on multiple authoritative sources + official documentation)

## Executive Summary

AI couples therapy apps are structured around four core domains: (1) secure user data management with partner linking, (2) audio capture and transcription, (3) AI-powered conversation analysis and reframing, and (4) privacy-first data handling. The architecture must balance real-time responsiveness with robust security for highly sensitive relationship data.

---

## Recommended Architecture

```
+------------------+     +------------------+     +------------------+
|   React Native   |     |   React Native   |     |   React Native   |
|   (Partner A)    |     |   (Partner B)    |     |   (Shared View)  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                    +-------------v--------------+
                    |      API Gateway           |
                    |   (Authentication/Rate     |
                    |    Limiting/Routing)       |
                    +-------------+--------------+
                                  |
        +------------+------------+------------+------------+
        |            |            |            |            |
+-------v------+ +---v----+ +----v-----+ +----v-----+ +----v-----+
|   Auth       | | User   | | Audio    | | Analysis | | Sharing  |
|   Service    | | Service| | Service  | | Service  | | Service  |
+--------------+ +--------+ +----------+ +----------+ +----------+
        |            |            |            |            |
        +------------+------------+------------+------------+
                                  |
                    +-------------v--------------+
                    |      PostgreSQL            |
                    |   (Encrypted at Rest)      |
                    +----------------------------+
                                  |
                    +-------------v--------------+
                    |   Object Storage (S3)     |
                    |   (Audio Files, E2E       |
                    |    Encrypted)             |
                    +----------------------------+
```

---

## Component Boundaries

### 1. Mobile Client (React Native + Expo)

| Responsibility | Details |
|----------------|---------|
| Audio Recording | Capture voice using `expo-audio` (new library, replaces deprecated `expo-av`) |
| Local Encryption | Encrypt audio before upload using device encryption APIs |
| Chat Interface | Text-based situation/emotion logging |
| Partner Linking | Generate/enter pairing codes |
| Offline Support | Queue recordings when offline, sync when connected |
| Secure Storage | Store auth tokens via `expo-secure-store` |

**Communicates With:** API Gateway (all external communication)

**Key Libraries:**
- `expo-audio` - Audio recording (NOT expo-av, which is deprecated)
- `expo-secure-store` - Secure token storage
- `expo-router` - File-based navigation
- `react-hook-form` + `zod` - Form validation
- `nativewind` - Styling

### 2. API Gateway

| Responsibility | Details |
|----------------|---------|
| Authentication | JWT validation, token refresh |
| Rate Limiting | Prevent abuse, especially on expensive AI endpoints |
| Request Routing | Direct to appropriate microservice |
| TLS Termination | All traffic encrypted via TLS 1.3 |

**Communicates With:** All backend services

**Technology Options:**
- AWS API Gateway (managed)
- Kong (self-hosted)
- Express.js middleware layer (simpler for MVP)

### 3. Auth Service

| Responsibility | Details |
|----------------|---------|
| User Registration | Email/password or OAuth (Google, Apple) |
| Session Management | JWT issuance and validation |
| MFA (Future) | SMS/TOTP second factor |
| Partner Linking | Pairing code generation and validation |

**Communicates With:** User Service, PostgreSQL

**Partner Linking Flow:**
```
1. Partner A: Request pairing code -> Auth Service generates 6-digit code (expires 10 min)
2. Partner A: Share code with Partner B (out-of-band: text, verbal)
3. Partner B: Enter code -> Auth Service validates, creates Partnership record
4. Both: Can now share analysis results based on sharing preferences
```

### 4. User Service

| Responsibility | Details |
|----------------|---------|
| Profile Management | User preferences, notification settings |
| Partnership Data | Linked partner relationships |
| Sharing Preferences | What to share (original, analysis only, nothing) |
| Subscription Status | Free/premium tier tracking |

**Communicates With:** Auth Service, PostgreSQL

### 5. Audio Service

| Responsibility | Details |
|----------------|---------|
| Audio Upload | Receive encrypted audio files |
| Storage Management | Store in S3 with encryption at rest |
| Transcription Orchestration | Send to transcription API, receive text |
| Audio Cleanup | Delete audio after configurable retention period |

**Communicates With:** Analysis Service, Object Storage, Transcription API

**Transcription Options (2025/2026):**

| Provider | Model | Pros | Cons |
|----------|-------|------|------|
| OpenAI | `gpt-4o-transcribe` | Best WER, streaming support | Cloud only, cost |
| OpenAI | `whisper-1` | Proven, cheaper | Legacy, no streaming |
| On-device | `whisper.cpp` via React Native | Privacy, no network | Large model size (~500MB), slower |

**Recommendation:** Use OpenAI `gpt-4o-transcribe` for cloud transcription. For privacy-sensitive users, offer on-device option in premium tier using whisper.cpp port.

### 6. Analysis Service (Core AI)

| Responsibility | Details |
|----------------|---------|
| Conversation Analysis | Parse transcription, identify speakers, extract key moments |
| Sentiment Detection | Identify emotional tone per speaker |
| Reframing Generation | Generate "what partner might have heard" perspectives |
| Action Suggestions | Provide concrete next steps |

**Communicates With:** Audio Service, Sharing Service, PostgreSQL

**AI Architecture:**

```
Transcription Text
       |
       v
+------+-------+
| Speaker      |  <- Diarization (who said what)
| Identification|
+------+-------+
       |
       v
+------+-------+
| Sentiment    |  <- Per-speaker emotional analysis
| Analysis     |
+------+-------+
       |
       v
+------+-------+
| Reframing    |  <- CORE VALUE: "Partner might have heard X as Y"
| Engine       |
+------+-------+
       |
       v
+------+-------+
| Action       |  <- Concrete suggestions
| Generator    |
+------+-------+
```

**LLM Integration:**

| Component | Recommended Model | Rationale |
|-----------|-------------------|-----------|
| Sentiment Analysis | GPT-4o-mini | Cost-effective, accurate for emotions |
| Reframing | GPT-4o | Complex perspective-taking needs stronger model |
| Action Suggestions | GPT-4o-mini | Simpler generation task |

**Prompt Engineering Considerations:**
- Use MIND-SAFE framework principles (safety filters, therapeutic grounding)
- Ground responses in evidence-based therapy (CBT reframing techniques)
- Include safety detection for crisis situations (suicide, domestic violence)
- Implement post-generation ethical filter

### 7. Sharing Service

| Responsibility | Details |
|----------------|---------|
| Permission Management | What each partner can see |
| Shared View Generation | Compile data for joint viewing |
| Notification | Alert partner when new shared content available |

**Communicates With:** User Service, Analysis Service, PostgreSQL

**Sharing Levels:**
```
NONE:        Partner sees nothing
ANALYSIS:    Partner sees reframing/suggestions only
FULL:        Partner sees original text + analysis
```

---

## Data Flow

### Flow 1: Personal Recording (Text)

```
1. User types situation/emotion in chat interface
2. Client sends encrypted text to API Gateway
3. Auth validation -> Analysis Service
4. Analysis Service:
   a. Sentiment analysis
   b. Reframing generation
   c. Action suggestions
5. Results stored in PostgreSQL
6. Client receives analysis
7. (Optional) Shared to partner based on sharing preference
```

**Latency Target:** < 3 seconds for analysis response

### Flow 2: Conflict Recording (Audio)

```
1. User starts recording in app
2. Audio captured via expo-audio
3. Client encrypts audio locally
4. On stop: Upload encrypted audio to API Gateway
5. Audio Service:
   a. Store in S3 (encrypted)
   b. Send to transcription API
   c. Receive transcript
6. Analysis Service:
   a. Speaker diarization
   b. Sentiment per speaker
   c. Reframing from each perspective
   d. Action suggestions
7. Results stored in PostgreSQL
8. Client receives analysis
9. Audio deleted after configurable retention (default: 7 days)
10. (Optional) Shared view available to partner
```

**Latency Target:** < 30 seconds for 5-minute audio

### Flow 3: Partner Viewing Shared Analysis

```
1. Partner B opens app, sees notification of shared content
2. Client requests shared analysis from API
3. Sharing Service:
   a. Verify partnership exists
   b. Check sharing permission level
   c. Filter data based on level
4. Client displays appropriate view
5. Both partners can add notes/reactions
```

---

## Database Design

### Core Tables (PostgreSQL)

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP,
  subscription_tier VARCHAR(50) DEFAULT 'free'
)

-- Partner relationships
partnerships (
  id UUID PRIMARY KEY,
  user_a_id UUID REFERENCES users,
  user_b_id UUID REFERENCES users,
  status VARCHAR(50),  -- pending, active, dissolved
  created_at TIMESTAMP,
  UNIQUE(user_a_id, user_b_id)
)

-- Entries (text or audio-based)
entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  entry_type VARCHAR(50),  -- text, audio
  content_encrypted TEXT,  -- for text entries
  audio_storage_key VARCHAR(255),  -- S3 key for audio
  sharing_level VARCHAR(50) DEFAULT 'none',
  created_at TIMESTAMP
)

-- Analysis results
analyses (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES entries,
  transcript_encrypted TEXT,
  sentiment_data JSONB,
  reframing_content JSONB,  -- main deliverable
  action_suggestions JSONB,
  created_at TIMESTAMP
)

-- Partner notes on shared analyses
partner_notes (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES analyses,
  user_id UUID REFERENCES users,
  note_encrypted TEXT,
  created_at TIMESTAMP
)
```

**Why PostgreSQL over MongoDB:**
- Row-Level Security (RLS) for fine-grained access control
- Column-Level Security (CLS) for sensitive fields
- Strong ACID compliance for relationship data integrity
- Proven security track record for regulated data
- JSON/JSONB support for flexible analysis results

---

## Security Architecture

### Encryption Layers

| Layer | Method | Purpose |
|-------|--------|---------|
| Transport | TLS 1.3 | Data in transit |
| Storage | AES-256 | Data at rest (DB, S3) |
| Application | Field-level encryption | Sensitive content (transcripts, notes) |
| Client | Platform encryption | Local secure storage |

### Access Control

```
Zero-Trust Principles:
1. Every request authenticated (JWT)
2. Every endpoint authorized (role/ownership check)
3. Every action logged (audit trail)
4. Minimum necessary data access
```

**Role-Based Access:**
- `user`: Access own data only
- `partner`: Access shared data from linked partner
- `admin`: Platform administration (no PHI access)

### Privacy-First Design

```
Principles:
1. PHI never in logs
2. PHI never in error messages
3. PHI never in analytics/telemetry
4. Audio deleted after configurable retention
5. Push notifications contain no content
6. Client-side encryption before upload
```

### Crisis Detection (Safety)

The Analysis Service must include crisis detection:

```
Crisis Keywords/Patterns:
- Suicide ideation
- Domestic violence indicators
- Severe mental health crisis

Response:
1. Flag entry immediately
2. Surface crisis resources in app
3. Do NOT provide AI reframing for crisis content
4. Encourage professional help
```

---

## Build Order (Dependencies)

Based on component dependencies, recommended build sequence:

### Phase 1: Foundation
**Build:** Auth Service, User Service, PostgreSQL schema, API Gateway

**Why First:** Everything depends on authentication and user management. Cannot test any feature without users.

**Deliverable:** Users can register, log in, create profile

### Phase 2: Core Recording (Text)
**Build:** Mobile client (chat interface), Analysis Service (text only), basic LLM integration

**Why Second:** Text recording is simpler than audio. Proves core value (reframing) without audio complexity.

**Deliverable:** Users can log situations via text, receive AI reframing

### Phase 3: Audio Pipeline
**Build:** Audio Service, expo-audio recording, transcription integration, enhanced Analysis Service

**Why Third:** Audio is more complex (recording, upload, transcription) but builds on existing analysis infrastructure.

**Deliverable:** Users can record audio, receive transcription + reframing

### Phase 4: Partner Features
**Build:** Sharing Service, partner linking flow, shared views

**Why Fourth:** Partner features require stable individual experience first. More complex permission logic.

**Deliverable:** Partners can link accounts, share analyses, view together

### Phase 5: Production Hardening
**Build:** Enhanced security, audit logging, crisis detection, retention policies, premium features

**Why Fifth:** Polish and security hardening after core features stable.

**Deliverable:** Production-ready secure application

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Database | Single PostgreSQL | Read replicas | Sharding by user_id |
| Audio Storage | Single S3 bucket | Regional buckets | CDN + regional storage |
| AI Processing | Direct API calls | Queue + workers | Auto-scaling workers + caching |
| Real-time | WebSocket per user | Redis Pub/Sub | Dedicated real-time service |

**MVP Focus:** Design for 10K users from start. Sharding decisions can wait.

---

## Technology Stack Summary

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Mobile | React Native + Expo | SDK 52+ | Cross-platform, rapid iteration |
| Navigation | expo-router | Latest | File-based routing, familiar |
| Audio | expo-audio | Latest | Replaces deprecated expo-av |
| Secure Storage | expo-secure-store | Latest | Platform-native encryption |
| Backend | Node.js + Express | Node 20+ | Unified JS stack, real-time capable |
| Database | PostgreSQL | 16+ | RLS, encryption, reliability |
| Object Storage | AWS S3 | - | Encrypted audio storage |
| Transcription | OpenAI gpt-4o-transcribe | - | Best accuracy, streaming |
| AI Analysis | OpenAI GPT-4o / GPT-4o-mini | - | Reframing quality |
| Cache | Redis | 7+ | Session, rate limiting |
| Hosting | AWS / GCP | - | HIPAA-eligible services |

---

## Anti-Patterns to Avoid

### 1. Storing Audio Indefinitely
**What:** Keeping all audio recordings forever
**Why Bad:** Legal liability, storage costs, privacy risk
**Instead:** Implement configurable retention (default 7 days), delete audio after analysis

### 2. PHI in Logs
**What:** Logging transcripts, emotions, or content for debugging
**Why Bad:** Compliance violation, security risk
**Instead:** Log only metadata (entry_id, timestamp, status), never content

### 3. Synchronous Audio Processing
**What:** Making user wait for transcription + analysis
**Why Bad:** Poor UX for long recordings
**Instead:** Queue audio processing, notify user when complete

### 4. Shared Data Without Consent
**What:** Automatically sharing all data with partner
**Why Bad:** Privacy violation, trust erosion
**Instead:** Explicit per-entry or per-account sharing preferences

### 5. Direct LLM Output to Users
**What:** Showing raw LLM response without safety filtering
**Why Bad:** Risk of inappropriate/harmful suggestions
**Instead:** Post-generation safety filter, crisis detection

---

## Sources

### Official Documentation
- [Expo Audio Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [OpenAI Speech-to-Text API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)

### Architecture References
- [Mental Health App Development Guide 2026](https://topflightapps.com/ideas/how-to-build-a-mental-health-app/)
- [HIPAA Compliant App Development 2025](https://appinventiv.com/blog/develop-hipaa-compliant-app/)
- [HIPAA Compliant Mobile Apps 2026](https://openforge.io/hipaa-compliant-mobile-apps-in-2026-a-practical-guide/)
- [PostgreSQL vs MongoDB 2025](https://xenoss.io/blog/postgresql-mongodb-comparison)

### Couples App Design
- [Building a Relationship App Guide](https://www.dhiwise.com/post/build-relationship-app)
- [Couples App Design Research](https://medium.com/design-bootcamp/relationships-beyond-matchmaking-designing-a-couple-app-for-a-better-love-life-f38ae5f39180)
- [Shared Data Architecture Patterns](https://www.vendia.com/blog/shared-data-architecture-patterns/)

### AI/LLM References
- [MIND-SAFE Framework for Mental Health Chatbots](https://mental.jmir.org/2025/1/e75078)
- [LLM Sentiment Analysis Architecture](https://www.searchunify.com/resource-center/sudo-technical-blogs/decoding-customer-sentiment-a-deep-dive-into-advanced-sentiment-analysis-with-llms-and-graphs)
- [React Native Mental Health App with Stream](https://getstream.io/blog/mental-health-react-native/)

### Backend Architecture
- [Node.js Backend 2026](https://www.nucamp.co/blog/node.js-and-express-in-2026-backend-javascript-for-full-stack-developers)
- [Node.js vs Python Backend 2025](https://kanhasoft.com/blog/node-js-vs-python-which-is-best-for-backend-development-in-2025/)
- [Expo for React Native 2025](https://hashrocket.com/blog/posts/expo-for-react-native-in-2025-a-perspective)
