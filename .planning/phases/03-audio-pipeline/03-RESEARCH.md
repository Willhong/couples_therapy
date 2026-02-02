# Phase 3: Audio Pipeline - Research

**Researched:** 2026-02-03
**Domain:** Audio recording, transcription with speaker diarization, pattern detection, data visualization
**Confidence:** HIGH

## Summary

Phase 3 adds voice recording (self-narration + live conflict), transcription with speaker diarization, a unified conversation list, pattern detection across all sessions, and an insights dashboard. The research covers six key technology domains: (1) audio recording on mobile via Expo, (2) server-side transcription with speaker diarization via OpenAI API, (3) audio upload and processing pipeline in Django, (4) chart/visualization for insights, (5) push notifications for weekly summaries, and (6) pattern detection architecture.

The critical finding is that **OpenRouter does NOT support the `/v1/audio/transcriptions` endpoint** -- transcription and diarization require a direct OpenAI API key. OpenAI's new `gpt-4o-transcribe-diarize` model ($0.006/min) provides native speaker diarization with Korean language support, eliminating the need for a separate diarization service. For mobile recording, `expo-av` is the proven choice (already compatible with the project's Expo SDK 54). M4A format at 128kbps allows ~26 minutes per 25MB upload limit, making a 30-minute max recording length practical.

**Primary recommendation:** Use `expo-av` for recording (m4a), upload to Django, transcribe via OpenAI `gpt-4o-transcribe-diarize` with `diarized_json` response format, use `react-native-gifted-charts` for insights visualization.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-av | ~15.0.x (Expo SDK 54) | Audio recording & playback | Official Expo audio library; proven, supports metering for waveform, m4a output |
| openai (Python) | >=1.50.0 | Transcription + diarization API client | Official Python SDK for OpenAI; direct access to gpt-4o-transcribe-diarize |
| react-native-gifted-charts | ^1.4.66 | Charts for insights dashboard | Most complete RN chart library; Expo-compatible; bar, line, pie charts |
| expo-notifications | ~0.32.x | Push notifications for weekly digest | Official Expo push notification library |
| django-celery-beat | >=2.5.0 | Scheduled background tasks (weekly digest) | Standard Django periodic task scheduler |
| celery | >=5.4.0 | Async task queue (transcription processing) | Industry standard for Django background tasks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-linear-gradient | ~14.0.x | Required by gifted-charts | Always (peer dependency) |
| react-native-svg | 15.12.1 | Required by gifted-charts | Already installed in project |
| expo-file-system | ~18.0.x | File management for audio uploads | Read/manage recorded audio files |
| redis | >=5.0 | Celery message broker | Already in project (channels-redis) |
| pydub or ffmpeg | latest | Audio splitting for >25MB files | Only if recordings exceed 25MB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-av | expo-audio (new) | expo-audio is newer with hooks API but less battle-tested for recording; expo-av has proven metering/waveform support |
| gpt-4o-transcribe-diarize | AssemblyAI / Deepgram | External providers with Korean diarization support, but OpenAI is simpler (one provider), same pricing, already needed for API key |
| react-native-gifted-charts | Victory Native | Victory is more customizable but heavier; gifted-charts is Expo-optimized with simpler API |
| Celery | Django-Q2 | Celery is the industry standard with better ecosystem; Django-Q2 is simpler but less mature |

**Installation:**

Backend:
```bash
pip install openai celery django-celery-beat redis
```

Frontend:
```bash
npx expo install expo-av expo-file-system expo-notifications expo-device expo-constants react-native-gifted-charts expo-linear-gradient
```

## Architecture Patterns

### Recommended Project Structure

Backend:
```
backend/apps/
├── audio/                    # NEW: Audio recording & transcription
│   ├── models.py            # AudioRecording, TranscriptSegment, TranscriptEdit
│   ├── views.py             # Upload, transcription status, transcript CRUD
│   ├── serializers.py       # Audio/transcript serialization
│   ├── services/
│   │   ├── transcription.py # OpenAI API integration
│   │   └── audio_utils.py   # File handling, chunking
│   ├── tasks.py             # Celery async transcription task
│   └── urls.py
├── patterns/                 # NEW: Pattern detection & insights
│   ├── models.py            # Pattern, InsightSummary, WeeklySummary
│   ├── views.py             # Pattern queries, insights dashboard data
│   ├── services/
│   │   ├── detector.py      # Trigger phrases, recurring topics, escalation
│   │   └── summarizer.py    # Weekly summary generation
│   ├── tasks.py             # Celery tasks for pattern analysis + weekly digest
│   └── urls.py
├── conversations/            # NEW: Unified conversation list (or extend chat app)
│   ├── models.py            # Extend Conversation model with type field
│   └── views.py             # Unified list endpoint
```

Frontend:
```
mobile/src/
├── features/
│   ├── recording/            # NEW: Audio recording feature
│   │   ├── components/
│   │   │   ├── RecordingScreen.tsx      # Main recording UI
│   │   │   ├── WaveformVisualizer.tsx   # Live waveform during recording
│   │   │   ├── RecordingControls.tsx    # Start/stop/pause buttons
│   │   │   ├── RecordingPreview.tsx     # Preview & re-record before submit
│   │   │   ├── GuidedPrompts.tsx        # Optional guided prompts for narration
│   │   │   └── LiveConsentFlow.tsx      # Partner consent for live recording
│   │   ├── hooks/
│   │   │   ├── useAudioRecording.ts     # Expo-av recording hook
│   │   │   └── useWaveform.ts           # Metering data for waveform
│   │   ├── services/
│   │   │   └── audioApi.ts              # Upload, status polling
│   │   └── types.ts
│   ├── transcript/           # NEW: Transcript display & editing
│   │   ├── components/
│   │   │   ├── TranscriptView.tsx       # Chat-bubble style transcript
│   │   │   ├── TranscriptLine.tsx       # Individual speaker line
│   │   │   ├── SpeakerAssignment.tsx    # Manual speaker name assignment
│   │   │   ├── AudioPlayer.tsx          # Full audio playback with seek
│   │   │   └── PostTranscriptActions.tsx # Reframe/Comfort/Keep actions
│   │   └── hooks/
│   │       └── useTranscript.ts
│   ├── conversations/        # NEW: Unified conversation list
│   │   ├── components/
│   │   │   ├── ConversationList.tsx     # FlatList of all sessions
│   │   │   └── ConversationCard.tsx     # Rich preview card
│   │   └── hooks/
│   │       └── useConversations.ts
│   └── insights/             # NEW: Pattern detection & insights
│       ├── components/
│       │   ├── InsightsDashboard.tsx    # Main insights screen
│       │   ├── PatternChart.tsx         # Charts for trends
│       │   ├── TriggerHighlight.tsx     # Inline trigger highlighting
│       │   └── WeeklySummaryCard.tsx    # Weekly digest view
│       └── hooks/
│           └── useInsights.ts
```

### Pattern 1: Async Transcription Pipeline
**What:** Upload audio -> return job ID -> poll for status -> get transcript when ready
**When to use:** All audio transcription (transcription takes 10-60 seconds depending on length)
**Example:**
```python
# Backend: views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_audio(request):
    audio_file = request.FILES.get('audio')
    recording_type = request.data.get('type')  # 'narration' or 'live'
    consent_session_id = request.data.get('consent_session_id')  # for live only

    # Validate consent for live recordings
    if recording_type == 'live':
        consent = RecordingConsent.objects.get(
            session_id=consent_session_id,
            status=RecordingConsent.Status.BOTH_CONSENTED
        )

    # Save recording model
    recording = AudioRecording.objects.create(
        user=request.user,
        recording_type=recording_type,
        status='processing',
    )

    # Save file temporarily (deleted after transcription)
    recording.save_audio_file(audio_file)

    # Queue async transcription
    transcribe_audio.delay(str(recording.id))

    return Response({'recording_id': str(recording.id), 'status': 'processing'})
```

```python
# Backend: tasks.py (Celery)
from celery import shared_task
from openai import OpenAI

@shared_task
def transcribe_audio(recording_id):
    recording = AudioRecording.objects.get(id=recording_id)
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    with recording.audio_file.open('rb') as audio:
        if recording.recording_type == 'live':
            # Use diarization model for live conflict recordings
            result = client.audio.transcriptions.create(
                model="gpt-4o-transcribe-diarize",
                file=audio,
                response_format="diarized_json",
                chunking_strategy="auto",
                language="ko",
            )
            # Save diarized segments
            for segment in result.segments:
                TranscriptSegment.objects.create(
                    recording=recording,
                    speaker=segment.speaker,
                    text=segment.text,
                    start_time=segment.start,
                    end_time=segment.end,
                )
        else:
            # Use standard transcription for self-narration
            result = client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=audio,
                language="ko",
            )
            TranscriptSegment.objects.create(
                recording=recording,
                speaker="user",
                text=result.text,
                start_time=0,
                end_time=recording.duration,
            )

    recording.status = 'completed'
    recording.full_text = result.text if hasattr(result, 'text') else ' '.join(s.text for s in result.segments)
    recording.save()

    # Delete audio file after transcription (privacy requirement)
    recording.delete_audio_file()

    # Trigger pattern analysis
    analyze_patterns.delay(str(recording.conversation_id))
```

### Pattern 2: Device-First Audio with Server Upload
**What:** Record on device, preview locally, upload only when user confirms
**When to use:** All recordings (supports re-record before submit, offline capability)
**Example:**
```typescript
// Frontend: useAudioRecording.ts
import { Audio } from 'expo-av';

export function useAudioRecording() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [metering, setMetering] = useState<number[]>([]);

  const startRecording = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (status) => {
        if (status.isRecording && status.metering !== undefined) {
          setMetering(prev => [...prev, status.metering!]);
        }
      },
      100 // metering update interval in ms
    );
    setRecording(recording);
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const fileUri = recording.getURI();
    setUri(fileUri);
    setRecording(null);
    return fileUri;
  };

  const uploadRecording = async (fileUri: string, type: 'narration' | 'live') => {
    const formData = new FormData();
    formData.append('audio', {
      uri: fileUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('type', type);

    const response = await api.post('/audio/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };

  return { startRecording, stopRecording, uploadRecording, metering, uri };
}
```

### Pattern 3: Comfort Mode (New AI Response Type)
**What:** Empathetic response that validates feelings without reframing
**When to use:** After self-narration transcript when user selects "Receive comfort"
**Example:**
```python
# Backend: comfort mode prompt (added to system_prompts.py)
COMFORT_MODE_PROMPT = """당신은 따뜻한 관계 코치입니다. 사용자가 힘든 감정을 표현했습니다.

## 역할
- 사용자의 감정을 있는 그대로 인정하고 공감하세요
- 리프레이밍이나 분석을 하지 마세요
- "그럴 수 있어요", "충분히 이해해요" 같은 공감 표현을 사용하세요
- 사용자가 느끼는 감정이 정당하다고 확인해주세요
- 짧고 따뜻하게 (3-5문장)

## 금지
- 상대방 관점 제시 금지
- "하지만", "그래도" 같은 전환 금지
- 조언이나 제안 금지
- "다음에는 이렇게 해보세요" 금지

## 형식
한국어 격식체로 자연스럽게 응답. JSON이 아닌 순수 텍스트로.
"""
```

### Anti-Patterns to Avoid
- **Storing audio long-term on server:** Decision says audio deleted after transcription. Only transcripts remain.
- **Synchronous transcription in HTTP request:** Transcription takes 10-60s. Must use async (Celery task) with polling or WebSocket notification.
- **Using OpenRouter for transcription:** OpenRouter does NOT have a `/v1/audio/transcriptions` endpoint. Must use direct OpenAI API.
- **WAV recording format:** WAV files are huge and not well-supported by expo-av on Android. Use m4a (AAC) which is the default and most reliable.
- **Real-time streaming transcription for self-narration:** Over-engineered. Post-recording transcription is sufficient for the UX described.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speaker diarization | Custom VAD + embedding pipeline | OpenAI gpt-4o-transcribe-diarize | Diarization is extremely complex; OpenAI handles it at $0.006/min with Korean support |
| Audio waveform visualization | Custom FFT analysis | expo-av metering data + SVG bars | Metering returns dB values at configurable intervals; just render as bar heights |
| Chart rendering | Custom SVG charts | react-native-gifted-charts | 75+ chart configurations, Expo-optimized, handles animations and interactions |
| Periodic task scheduling | Custom cron/setTimeout | Celery Beat + django-celery-beat | Handles timezone, persistence, admin UI, reliable scheduling |
| Push notification infrastructure | Custom APNs/FCM integration | expo-notifications + Expo push service | Handles token management, platform differences, certificate management |
| Audio file chunking (>25MB) | Custom splitting logic | pydub or ffmpeg subprocess | Handles codec, timestamps, seamless boundaries |
| Trigger phrase detection | Regex-only approach | LLM-based pattern analysis | Korean grammar makes regex unreliable; LLM understands context and nuance |

**Key insight:** The transcription + diarization domain is the most critical "don't hand-roll." Self-hosting Whisper + pyannote would require GPU infrastructure, model management, and Korean language tuning. OpenAI's hosted API eliminates all of this at $0.006/min.

## Common Pitfalls

### Pitfall 1: OpenRouter vs OpenAI API confusion
**What goes wrong:** Attempting to use OpenRouter (the project's existing LLM provider) for audio transcription
**Why it happens:** The project already uses OpenRouter for chat completions, so it seems natural to route all API calls through it
**How to avoid:** OpenRouter only supports `/api/v1/chat/completions`. Audio transcription requires a direct OpenAI API key with the `/v1/audio/transcriptions` endpoint. Add `OPENAI_API_KEY` to `.env` alongside `OPENROUTER_API_KEY`.
**Warning signs:** 404 errors when trying to call transcription endpoint via OpenRouter base URL

### Pitfall 2: Blocking the request thread during transcription
**What goes wrong:** Calling OpenAI transcription API synchronously in a Django view, causing 30-60 second HTTP timeouts
**Why it happens:** Transcription of a 10-minute audio file can take 30+ seconds
**How to avoid:** Use Celery async tasks. Upload endpoint returns immediately with a `recording_id`. Frontend polls a `/status/` endpoint or receives WebSocket notification when done.
**Warning signs:** HTTP 504 gateway timeout errors, UI freezing on submit

### Pitfall 3: expo-av permission and audio mode not set
**What goes wrong:** Recording starts but produces silent/empty files, or fails silently on iOS
**Why it happens:** iOS requires explicit `allowsRecordingIOS: true` and `playsInSilentModeIOS: true` before recording
**How to avoid:** Always call `Audio.setAudioModeAsync()` before `Recording.createAsync()`. Request permissions with `Audio.requestPermissionsAsync()` first.
**Warning signs:** Empty audio files, "recording not prepared" errors

### Pitfall 4: M4A upload content type mismatch
**What goes wrong:** Server receives corrupted audio file, transcription fails with "invalid file format"
**Why it happens:** React Native FormData doesn't always set correct MIME type for m4a files, especially on iOS
**How to avoid:** Explicitly set `type: 'audio/m4a'` and `name: 'recording.m4a'` in the FormData blob. On the Django side, don't validate MIME type from headers; let OpenAI SDK handle format detection.
**Warning signs:** OpenAI API returns "Invalid file format" error

### Pitfall 5: Audio not deleted after transcription
**What goes wrong:** Audio files accumulate on server, violating privacy policy
**Why it happens:** Transcription task fails partway through, or deletion step is skipped in error paths
**How to avoid:** Use try/finally in the Celery task to ensure audio deletion happens regardless of transcription success. Also add a periodic cleanup task for orphaned files.
**Warning signs:** Growing storage usage, audio files older than 1 hour still on disk

### Pitfall 6: Diarization returns generic labels without speaker mapping
**What goes wrong:** Transcript shows "Speaker A" and "Speaker B" but user doesn't know which is which
**Why it happens:** gpt-4o-transcribe-diarize returns generic labels ("A", "B") unless speaker reference audio is provided. This is by design.
**How to avoid:** Accept this as expected behavior. After transcription, present UI for manual speaker assignment (user maps "Speaker A" -> "나", "Speaker B" -> "파트너"). Store the mapping in the database.
**Warning signs:** Users confused by "Speaker A/B" labels

### Pitfall 7: Pattern detection running on every request
**What goes wrong:** Insights page is slow, database queries heavy
**Why it happens:** Pattern detection is computed on-the-fly for each page load
**How to avoid:** Run pattern analysis as a Celery task after each new session is saved. Store computed patterns in the database. Insights page reads pre-computed data.
**Warning signs:** Slow insights page load, high database query count

### Pitfall 8: expo-notifications requires development build
**What goes wrong:** Push notifications don't work in Expo Go
**Why it happens:** Push notification capabilities are not built into Expo Go
**How to avoid:** Test notifications using a development build (`npx expo run:ios` or `npx expo run:android`). For weekly digest, also test with local scheduled notifications first.
**Warning signs:** "Notifications not available" errors in Expo Go

## Code Examples

Verified patterns from official sources and documentation:

### OpenAI Transcription with Diarization (Python)
```python
# Source: OpenAI official documentation
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

with open("recording.m4a", "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="gpt-4o-transcribe-diarize",
        file=audio_file,
        response_format="diarized_json",
        chunking_strategy="auto",
        language="ko",
    )

# Response structure:
# transcript.text = "전체 텍스트..."
# transcript.duration = 42.7
# transcript.segments = [
#     { type: "transcript.text.segment", id: "seg_001",
#       start: 0.0, end: 5.2, text: "오늘 진짜 화났어", speaker: "A" },
#     { type: "transcript.text.segment", id: "seg_002",
#       start: 5.5, end: 10.1, text: "왜 또 그런 말을 해", speaker: "B" },
# ]
```

### Expo-av Audio Recording with Metering
```typescript
// Source: Expo official documentation + community best practices
import { Audio } from 'expo-av';

// Request permissions
const { status } = await Audio.requestPermissionsAsync();

// Set audio mode (REQUIRED before recording)
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
});

// Start recording with metering enabled
const recording = new Audio.Recording();
await recording.prepareToRecordAsync({
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
});
await recording.startAsync();

// Poll metering data for waveform (every 100ms)
const interval = setInterval(async () => {
  const status = await recording.getStatusAsync();
  if (status.isRecording && status.metering !== undefined) {
    // status.metering is in dB (e.g., -30 to 0)
    // Convert to 0-1 range for visualization
    const normalized = Math.max(0, (status.metering + 60) / 60);
    addMeteringData(normalized);
  }
}, 100);

// Stop recording
clearInterval(interval);
await recording.stopAndUnloadAsync();
const uri = recording.getURI(); // local file URI (m4a)
```

### Gifted Charts - Line Chart for Conflict Frequency
```typescript
// Source: react-native-gifted-charts documentation
import { LineChart } from 'react-native-gifted-charts';

const conflictData = [
  { value: 3, label: '1월', dataPointText: '3' },
  { value: 5, label: '2월', dataPointText: '5' },
  { value: 2, label: '3월', dataPointText: '2' },
  { value: 4, label: '4월', dataPointText: '4' },
];

<LineChart
  data={conflictData}
  width={300}
  height={200}
  color="#6B7FD7"
  thickness={2}
  dataPointsColor="#6B7FD7"
  xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 12 }}
  yAxisTextStyle={{ color: '#6B7280', fontSize: 12 }}
  curved
  areaChart
  startFillColor="rgba(107, 127, 215, 0.3)"
  endFillColor="rgba(107, 127, 215, 0.01)"
/>
```

### Celery Task for Weekly Pattern Summary
```python
# Source: Celery + django-celery-beat documentation
from celery import shared_task
from celery.schedules import crontab

# In config/celery.py
app.conf.beat_schedule = {
    'weekly-pattern-summary': {
        'task': 'apps.patterns.tasks.generate_weekly_summary',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Monday 9am KST
    },
}
app.conf.timezone = 'Asia/Seoul'

# In apps/patterns/tasks.py
@shared_task
def generate_weekly_summary(couple_id=None):
    """Generate weekly pattern summary for all couples (or specific couple)."""
    from apps.couples.models import Couple

    couples = [Couple.objects.get(id=couple_id)] if couple_id else Couple.objects.filter(status='active')

    for couple in couples:
        sessions = get_sessions_last_week(couple)
        if not sessions:
            continue

        summary = analyze_weekly_patterns(sessions)
        WeeklySummary.objects.create(
            couple=couple,
            period_start=last_monday(),
            period_end=last_sunday(),
            summary_text=summary['text'],
            pattern_data=summary['patterns'],
        )

        # Send push notification to both partners
        send_weekly_digest_notification(couple)
```

### Upload Audio from React Native to Django
```typescript
// Source: Expo File System + Axios patterns
import * as FileSystem from 'expo-file-system';
import { api } from '@/lib/api';

async function uploadAudio(uri: string, type: 'narration' | 'live', consentId?: string) {
  const formData = new FormData();

  formData.append('audio', {
    uri,
    type: 'audio/m4a',
    name: `recording_${Date.now()}.m4a`,
  } as any);

  formData.append('type', type);
  if (consentId) {
    formData.append('consent_session_id', consentId);
  }

  const response = await api.post('/api/audio/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60s for large file uploads
  });

  return response.data; // { recording_id, status: 'processing' }
}

// Poll for transcription status
async function pollTranscriptionStatus(recordingId: string): Promise<TranscriptResult> {
  const maxAttempts = 60; // 60 attempts * 2s = 2 min max
  for (let i = 0; i < maxAttempts; i++) {
    const response = await api.get(`/api/audio/${recordingId}/status/`);
    if (response.data.status === 'completed') {
      return response.data;
    }
    if (response.data.status === 'failed') {
      throw new Error(response.data.error);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Transcription timed out');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Whisper-1 + separate diarization (pyannote) | gpt-4o-transcribe-diarize (native diarization) | Late 2025 | Single API call for transcription + diarization; no separate service needed |
| expo-av only | expo-av (recording) + expo-audio (playback, new) | 2025 | expo-audio adds hooks API; expo-av still preferred for recording due to maturity |
| Self-hosted Whisper | OpenAI hosted API at $0.006/min | Ongoing | Eliminates GPU infrastructure; Korean language support built-in |
| react-native-chart-kit | react-native-gifted-charts | 2024-2025 | Gifted-charts is more actively maintained, Expo-compatible, richer chart types |
| Manual push notification setup | expo-notifications (managed) | Ongoing | Expo handles APNs/FCM certificates; unified API |

**Deprecated/outdated:**
- **whisper-1 model for diarization:** No native diarization; use gpt-4o-transcribe-diarize instead
- **react-native-gifted-chat:** Already removed from project (caused infinite re-render in RN 0.81)
- **SSE for streaming:** Already decided against (RN doesn't support ReadableStream)

## Discretionary Decisions (Claude's Recommendations)

### Maximum Recording Length: 30 minutes
**Rationale:** At 128kbps AAC (m4a), 30 minutes produces ~28MB -- just over the 25MB API limit but can be slightly compressed or split. Most couples' arguments last 5-20 minutes. 30 minutes gives buffer without excessive cost ($0.18 per max-length recording).

### Audio Storage Strategy: Device-first, server-transient
**Rationale:** Audio stays on device until user confirms upload. Server receives file, transcribes via Celery task, then deletes audio file. Only transcript text remains in database (encrypted with fernet_fields). This satisfies the privacy requirement while keeping architecture simple. No need for S3/cloud storage -- Django's default file storage with a temp directory suffices.

### Real-time Transcription: Not needed for v1
**Rationale:** The CONTEXT.md mentions "real-time preview during recording + refined post-processing after." For v1, skip real-time preview (which would require streaming audio to a server and real-time Whisper). Instead, show a "processing..." indicator after recording stops, then display the full transcript. Real-time preview is a significant complexity increase for marginal UX benefit. The "refined post-processing" is simply the standard transcription.

### Chart/Visualization: react-native-gifted-charts
**Rationale:** Already Expo-compatible, actively maintained, supports all needed chart types (line for frequency trends, bar for topic distribution, pie for category breakdown). Lighter than Victory Native. Already has react-native-svg as peer dependency (already in project).

### Comfort Mode Prompt Engineering
**Rationale:** Simple system prompt that validates emotions without analysis. No JSON response needed (unlike reframing mode). Returns plain text empathetic response. Keep it short (3-5 sentences) and warm. Add as a third mode option alongside "chat" and "reframing" in the pipeline, or implement as a separate simple endpoint.

### Emotion Detection Approach: LLM-based intensity scoring
**Rationale:** After transcription, send transcript text to LLM with a prompt asking for emotional intensity on a 1-5 scale per segment. Store as metadata. Display as subtle color coding (light blue -> deep red gradient) on transcript lines. This is simpler and more accurate for Korean than rule-based sentiment analysis.

## Open Questions

Things that couldn't be fully resolved:

1. **gpt-4o-transcribe-diarize accuracy for Korean specifically**
   - What we know: OpenAI claims 99+ language support including Korean. The model is new (late 2025).
   - What's unclear: No published Korean-specific WER/CER benchmarks for the diarize model
   - Recommendation: Test with sample Korean audio during implementation. Have fallback to gpt-4o-transcribe (without diarization) if quality is poor. Consider AssemblyAI as backup for Korean diarization.

2. **Expo Go limitations for push notifications**
   - What we know: Push notifications do NOT work in Expo Go. Requires a development build.
   - What's unclear: Whether the project is already using development builds or still on Expo Go
   - Recommendation: If still on Expo Go, push notifications should be the last feature implemented in this phase, and may require switching to development builds.

3. **Celery worker deployment**
   - What we know: Celery requires a separate worker process + Redis as broker (Redis already in project for channels)
   - What's unclear: Current deployment setup -- is it just `python manage.py runserver` or is there infrastructure for worker processes?
   - Recommendation: For development, use `celery -A config worker --beat --loglevel=info` alongside the Django server. Document production deployment requirements.

4. **25MB file size limit for long recordings**
   - What we know: OpenAI API has 25MB limit. gpt-4o-transcribe has 25-minute duration limit. At 128kbps m4a, ~26 minutes fits in 25MB.
   - What's unclear: Whether the diarize model has the same 25-minute limit
   - Recommendation: Set max recording to 30 minutes in the app. If file exceeds 25MB, split server-side with pydub/ffmpeg before sending to API. Most realistic conflict recordings will be well under this limit.

5. **Weekly notification trigger reliability on Android**
   - What we know: WeeklyTriggerInput has reported bugs on Android (GitHub issues #30577, #34782)
   - What's unclear: Whether these are resolved in latest expo-notifications
   - Recommendation: Use server-side push notifications via Expo push service (triggered by Celery Beat) instead of local scheduled notifications. More reliable and allows dynamic content in the notification.

## Sources

### Primary (HIGH confidence)
- OpenAI API Documentation - gpt-4o-transcribe-diarize model, API reference, speech-to-text guide
- Expo Documentation - expo-av, expo-audio, expo-notifications official docs
- react-native-gifted-charts npm/GitHub - v1.4.66, Expo compatibility, installation
- Celery Documentation - Periodic tasks, django-celery-beat setup
- OpenAI Community Forum - diarized_json response format, chunking_strategy requirement, working code examples

### Secondary (MEDIUM confidence)
- AssemblyAI docs - Korean speaker diarization support (confirmed in 95 languages)
- Deepgram docs - Korean language support (beta), language-agnostic diarization
- DEV Community - expo-av metering for waveform visualization (isMeteringEnabled approach)
- WebSearch - OpenRouter does NOT support audio transcription endpoint (confirmed via community + docs)

### Tertiary (LOW confidence)
- gpt-4o-transcribe-diarize Korean accuracy - no published benchmarks, relying on OpenAI's "99+ languages" claim
- expo-notifications weekly trigger Android reliability - known issues reported but unclear if resolved

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs verified for all core libraries
- Architecture: HIGH - Follows standard Django + Celery + Expo patterns; builds on existing codebase patterns
- Transcription API: HIGH - OpenAI official docs confirm diarize model, pricing, parameters
- Charts/Visualization: HIGH - react-native-gifted-charts Expo compatibility confirmed
- Push notifications: MEDIUM - expo-notifications well-documented but Android recurring trigger has known bugs
- Pattern detection: MEDIUM - Architecture is standard but detection logic requires prompt engineering iteration
- Korean diarization quality: LOW - No specific benchmarks available; needs real-world testing

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - OpenAI models and Expo SDK are relatively stable)
