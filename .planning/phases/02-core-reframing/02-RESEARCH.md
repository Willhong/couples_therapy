# Phase 2: Core Reframing - Research

**Researched:** 2026-01-23
**Domain:** Chat Interface, Claude AI Integration, Reframing System, Partner Sharing, Context Management
**Confidence:** HIGH

---

## Summary

Phase 2 builds the core value proposition: text-based conflict logging with AI-powered perspective reframing. Users describe conflicts via chat, the AI organizes messy input into coherent descriptions, then provides bidirectional reframing ("how they heard you" AND "how you heard them") with actionable suggestions.

Key findings:
- **Claude API streaming** via Django async views provides real-time response delivery essential for chat UX
- **React Native Gifted Chat** remains the standard for chat UI, with built-in typing indicators and customization
- **Context window management** through rolling summarization allows "infinite" chat while maintaining personality/situation awareness
- **WebSocket (existing)** can relay AI responses in real-time; SSE is an alternative for one-way streaming
- **Multi-step onboarding wizard** patterns are well-established for attachment style/goal questionnaires

**Primary recommendation:** Use Django async StreamingHttpResponse with Anthropic Python SDK streaming for AI responses. Implement rolling conversation summarization to maintain context within Claude's context window. Use existing Django Channels WebSocket for real-time partner notifications and sharing. Build chat UI with react-native-gifted-chat customized for reframing modal workflow.

---

## Standard Stack

### Core Backend (AI Integration)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **anthropic** | 0.52+ | Claude API SDK | Official Python SDK with streaming support, async/sync modes |
| **Django 5.x** | 5.0+ | Backend framework | Already in Phase 1, async view support for streaming |
| **channels** | 4.3+ | WebSocket/Real-time | Already in Phase 1, for partner sharing notifications |

### Core Frontend (Chat & Forms)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **react-native-gifted-chat** | 2.x | Chat UI | Most complete chat UI for React Native, TypeScript, customizable |
| **react-native-typing-animation** | 0.1.7+ | Typing indicator | Simple, performant typing animation for AI thinking state |
| **react-hook-form** | 7.x | Form management | Performant forms for onboarding questionnaire |
| **zod** | 3.x | Validation | Type-safe schema validation for forms and API responses |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@tanstack/react-query** | 5.x | Server state | Already in stack; for chat history fetching, caching |
| **zustand** | 5.x | Client state | Already in stack; for chat UI state, draft messages |
| **expo-clipboard** | SDK 53+ | Copy functionality | Copy AI responses (per CONTEXT.md decision) |
| **expo-haptics** | SDK 53+ | Tactile feedback | Optional: haptic feedback on message send |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-gifted-chat | Stream Chat SDK | Stream adds vendor lock-in and cost; Gifted Chat is free/flexible |
| react-native-gifted-chat | Custom FlatList | More work, reinventing wheel; Gifted Chat handles edge cases |
| SSE (StreamingHttpResponse) | WebSocket | WebSocket more complex for one-way streaming; SSE simpler for AI responses |
| Rolling summarization | Full history | Full history exceeds context window; summarization maintains awareness |

**Installation:**
```bash
# Backend (add to requirements.txt)
anthropic>=0.52.0

# Frontend
npm install react-native-gifted-chat react-native-typing-animation
npm install react-hook-form zod @hookform/resolvers
npx expo install expo-clipboard expo-haptics
```

---

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── apps/
│   ├── chat/                    # NEW: Chat/conversation app
│   │   ├── models.py            # Conversation, Message, Reframing models
│   │   ├── serializers.py       # Chat API serializers
│   │   ├── views.py             # Chat endpoints including streaming
│   │   ├── consumers.py         # WebSocket for real-time updates
│   │   ├── services/
│   │   │   ├── claude_service.py    # Claude API integration
│   │   │   ├── context_manager.py   # Conversation summarization
│   │   │   └── reframing_service.py # Reframing generation logic
│   │   └── prompts/
│   │       ├── system_prompts.py    # System prompts for Claude
│   │       └── reframing_prompts.py # Reframing-specific prompts
│   ├── onboarding/              # NEW: Onboarding questionnaire
│   │   ├── models.py            # UserProfile, AttachmentStyle, Goals
│   │   └── views.py             # Onboarding API endpoints
│   └── sharing/                 # NEW: Partner sharing
│       ├── models.py            # SharedContent, SharingPermission
│       └── views.py             # Sharing endpoints

mobile/
├── src/
│   ├── features/
│   │   ├── chat/
│   │   │   ├── components/
│   │   │   │   ├── ChatScreen.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── SuggestionChips.tsx
│   │   │   │   └── AIThinkingIndicator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts
│   │   │   │   └── useStreamingResponse.ts
│   │   │   └── services/
│   │   │       └── chatApi.ts
│   │   ├── reframing/
│   │   │   ├── components/
│   │   │   │   ├── ReframingModal.tsx
│   │   │   │   ├── PerspectiveView.tsx
│   │   │   │   └── SuggestionList.tsx
│   │   │   └── hooks/
│   │   │       └── useReframing.ts
│   │   ├── onboarding/
│   │   │   ├── components/
│   │   │   │   ├── QuestionnaireWizard.tsx
│   │   │   │   ├── AttachmentStyleStep.tsx
│   │   │   │   └── GoalSelectionStep.tsx
│   │   │   └── hooks/
│   │   │       └── useOnboardingProgress.ts
│   │   └── sharing/
│   │       ├── components/
│   │       │   └── ShareModal.tsx
│   │       └── hooks/
│   │           └── usePartnerSharing.ts
```

### Pattern 1: Django Async Streaming for Claude API

**What:** Async view that streams Claude responses to mobile client
**When to use:** All AI response endpoints

```python
# apps/chat/views.py
import asyncio
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

async def generate_reframing_stream(conversation_context: str, user_message: str):
    """
    Async generator that yields Claude streaming response chunks.
    Yields SSE-formatted data for client consumption.
    """
    try:
        async with client.messages.stream(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2048,
            system=REFRAMING_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"{conversation_context}\n\n최근 메시지: {user_message}"}
            ],
        ) as stream:
            async for text in stream.text_stream:
                # SSE format: data: <content>\n\n
                yield f"data: {text}\n\n"

        # Signal completion
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: [ERROR] {str(e)}\n\n"


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def stream_reframing(request):
    """
    Streaming endpoint for Claude reframing response.
    Uses async StreamingHttpResponse for SSE.
    """
    conversation_id = request.data.get('conversation_id')
    message = request.data.get('message')

    # Get conversation context (summarized if needed)
    context = get_conversation_context(conversation_id, request.user)

    response = StreamingHttpResponse(
        generate_reframing_stream(context, message),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    return response
```

### Pattern 2: Conversation Context Manager with Rolling Summarization

**What:** Manages conversation history to fit within Claude's context window
**When to use:** Any conversation exceeding ~10 messages

```python
# apps/chat/services/context_manager.py
from anthropic import Anthropic
from django.conf import settings

client = Anthropic()

SUMMARIZATION_PROMPT = """다음 대화 내용을 핵심 정보만 보존하여 요약해주세요:
- 갈등의 주요 주제와 맥락
- 언급된 감정과 우려사항
- 파트너에 대한 중요한 정보
- 아직 해결되지 않은 문제

대화 내용:
{conversation}

200자 이내로 요약:"""

class ConversationContextManager:
    """
    Manages conversation context using rolling summarization.
    Keeps recent messages verbatim + summarized older context.
    """

    MAX_RECENT_MESSAGES = 10  # Keep last 10 messages verbatim
    SUMMARY_TRIGGER_COUNT = 20  # Summarize when exceeding this

    def __init__(self, conversation_id: int):
        self.conversation_id = conversation_id
        self._cached_summary = None

    def get_context_for_ai(self) -> str:
        """
        Returns optimized context string for Claude API.
        Format: [Summary of older messages] + [Recent messages verbatim]
        """
        from apps.chat.models import Message, ConversationSummary

        messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).order_by('-created_at')

        total_count = messages.count()

        if total_count <= self.MAX_RECENT_MESSAGES:
            # Few messages: return all verbatim
            return self._format_messages(messages.reverse())

        # Get recent messages verbatim
        recent_messages = list(messages[:self.MAX_RECENT_MESSAGES])
        recent_messages.reverse()

        # Get or create summary of older messages
        summary = self._get_or_create_summary()

        context_parts = []
        if summary:
            context_parts.append(f"[이전 대화 요약]\n{summary}\n")
        context_parts.append("[최근 대화]")
        context_parts.append(self._format_messages(recent_messages))

        return "\n".join(context_parts)

    def _get_or_create_summary(self) -> str:
        """Get cached summary or generate new one."""
        from apps.chat.models import Message, ConversationSummary

        # Check for existing valid summary
        existing = ConversationSummary.objects.filter(
            conversation_id=self.conversation_id
        ).order_by('-created_at').first()

        if existing and self._is_summary_current(existing):
            return existing.summary_text

        # Generate new summary
        older_messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).order_by('created_at')[:-self.MAX_RECENT_MESSAGES]

        if not older_messages.exists():
            return ""

        summary_text = self._generate_summary(older_messages)

        ConversationSummary.objects.create(
            conversation_id=self.conversation_id,
            summary_text=summary_text,
            message_count=older_messages.count()
        )

        return summary_text

    def _generate_summary(self, messages) -> str:
        """Use Claude to summarize older messages."""
        formatted = self._format_messages(messages)

        response = client.messages.create(
            model="claude-haiku-3-5-20241022",  # Use Haiku for cost-effective summarization
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": SUMMARIZATION_PROMPT.format(conversation=formatted)
            }]
        )

        return response.content[0].text

    def _format_messages(self, messages) -> str:
        """Format messages for Claude context."""
        lines = []
        for msg in messages:
            role = "나" if msg.is_user else "AI"
            lines.append(f"{role}: {msg.content}")
        return "\n".join(lines)

    def _is_summary_current(self, summary) -> bool:
        """Check if summary is still valid."""
        from apps.chat.models import Message
        current_count = Message.objects.filter(
            conversation_id=self.conversation_id
        ).count()
        # Summary is current if message count hasn't grown too much
        return current_count - summary.message_count < self.SUMMARY_TRIGGER_COUNT
```

### Pattern 3: React Native Chat with Streaming Response

**What:** Mobile chat screen consuming SSE stream for AI responses
**When to use:** Main chat interface

```typescript
// src/features/chat/hooks/useStreamingResponse.ts
import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  error: string | null;
}

export function useStreamingResponse() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (
    conversationId: string,
    message: string,
    onChunk?: (text: string) => void,
    onComplete?: (fullText: string) => void,
  ) => {
    // Cancel any existing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState({ isStreaming: true, streamedText: '', error: null });

    try {
      const response = await fetch(`${api.defaults.baseURL}/chat/stream-reframing/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ conversation_id: conversationId, message }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              onComplete?.(fullText);
              setState(prev => ({ ...prev, isStreaming: false }));
              return;
            }

            if (data.startsWith('[ERROR]')) {
              throw new Error(data.slice(8));
            }

            fullText += data;
            setState(prev => ({ ...prev, streamedText: fullText }));
            onChunk?.(data);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setState({ isStreaming: false, streamedText: '', error: error.message });
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, startStreaming, stopStreaming };
}
```

```typescript
// src/features/chat/components/ChatScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GiftedChat, IMessage, Bubble } from 'react-native-gifted-chat';
import { TypingAnimation } from 'react-native-typing-animation';
import { useStreamingResponse } from '../hooks/useStreamingResponse';
import { SuggestionChips } from './SuggestionChips';
import { AIThinkingIndicator } from './AIThinkingIndicator';

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const { isStreaming, streamedText, startStreaming, stopStreaming } = useStreamingResponse();

  // AI message being streamed
  const [streamingMessage, setStreamingMessage] = useState<IMessage | null>(null);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    const userMessage = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));

    // Create placeholder AI message
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: IMessage = {
      _id: aiMessageId,
      text: '',
      createdAt: new Date(),
      user: { _id: 'ai', name: 'AI 코치' },
    };
    setStreamingMessage(aiMessage);

    // Start streaming
    await startStreaming(
      conversationId,
      userMessage.text,
      (chunk) => {
        setStreamingMessage(prev => prev ? { ...prev, text: prev.text + chunk } : null);
      },
      (fullText) => {
        // Replace streaming message with final message
        setStreamingMessage(null);
        setMessages(prev => GiftedChat.append(prev, [{
          _id: aiMessageId,
          text: fullText,
          createdAt: new Date(),
          user: { _id: 'ai', name: 'AI 코치' },
        }]));
      }
    );
  }, [conversationId, startStreaming]);

  // Combine stored messages with streaming message
  const displayMessages = streamingMessage
    ? GiftedChat.append(messages, [streamingMessage])
    : messages;

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={displayMessages}
        onSend={onSend}
        user={{ _id: 'user' }}
        text={inputText}
        onInputTextChanged={setInputText}
        placeholder="갈등 상황을 설명해주세요..."
        renderFooter={() => isStreaming ? <AIThinkingIndicator /> : null}
        renderBubble={(props) => (
          <Bubble
            {...props}
            wrapperStyle={{
              left: { backgroundColor: '#F3F4F6' },
              right: { backgroundColor: '#6B7FD7' },
            }}
          />
        )}
        // Korean locale
        locale="ko"
        // Performance optimizations
        inverted={true}
        listViewProps={{
          initialNumToRender: 20,
          maxToRenderPerBatch: 10,
          windowSize: 10,
        }}
      />
      {!isStreaming && (
        <SuggestionChips
          onSelect={(suggestion) => setInputText(prev => prev + suggestion)}
        />
      )}
    </View>
  );
}
```

### Pattern 4: Reframing Modal with Structured Sections

**What:** Separate view displaying bidirectional reframing analysis
**When to use:** After AI processes conflict description and generates reframing

```typescript
// src/features/reframing/components/ReframingModal.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReframingData {
  whatYouSaid: string;
  howTheyHeard: string;
  howYouHeardThem?: string;
  whyTheGap: string;
  suggestions: string[];
  originalQuotes: string[];
}

interface Props {
  visible: boolean;
  data: ReframingData;
  onClose: () => void;
  onAcknowledge: () => void;
  onFollowUp: (prompt: string) => void;
}

export function ReframingModal({ visible, data, onClose, onAcknowledge, onFollowUp }: Props) {
  const [viewMode, setViewMode] = useState<'sequential' | 'sideBySide' | 'tabbed'>('sequential');
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge();
  };

  const handleClose = () => {
    if (!acknowledged) {
      // User must acknowledge before closing
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>관점 분석</Text>
          <TouchableOpacity onPress={handleClose} disabled={!acknowledged}>
            <Ionicons name="close" size={24} color={acknowledged ? '#333' : '#CCC'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Section 1: What You Said */}
          <ReframingSection
            icon="chatbubble-outline"
            title="당신이 말한 것"
            content={data.whatYouSaid}
            quotes={data.originalQuotes}
          />

          {/* Section 2: How They Might Have Heard It */}
          <ReframingSection
            icon="ear-outline"
            title="상대방이 들었을 수 있는 것"
            content={data.howTheyHeard}
            highlight
          />

          {/* Section 3: How You Heard Them (bidirectional) */}
          {data.howYouHeardThem && (
            <ReframingSection
              icon="swap-horizontal-outline"
              title="당신이 상대방의 말을 들은 방식"
              content={data.howYouHeardThem}
            />
          )}

          {/* Section 4: Why The Gap */}
          <ReframingSection
            icon="help-circle-outline"
            title="왜 이런 차이가 생겼을까요"
            content={data.whyTheGap}
          />

          {/* Section 5: Suggestions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color="#6B7FD7" />
              <Text style={styles.sectionTitle}>다음에 시도해볼 것</Text>
            </View>
            {data.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <Text style={styles.suggestionNumber}>{index + 1}</Text>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Follow-up Buttons */}
        <View style={styles.followUpContainer}>
          <TouchableOpacity
            style={styles.followUpButton}
            onPress={() => onFollowUp('이 부분에 대해 더 자세히 알려주세요')}
          >
            <Text style={styles.followUpText}>더 자세히 알려주세요</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.followUpButton}
            onPress={() => onFollowUp('이 분석에 동의하지 않아요')}
          >
            <Text style={styles.followUpText}>동의하지 않아요</Text>
          </TouchableOpacity>
        </View>

        {/* Acknowledgment Button */}
        {!acknowledged && (
          <TouchableOpacity style={styles.acknowledgeButton} onPress={handleAcknowledge}>
            <Text style={styles.acknowledgeText}>읽었습니다</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

function ReframingSection({ icon, title, content, quotes, highlight }: {
  icon: string;
  title: string;
  content: string;
  quotes?: string[];
  highlight?: boolean;
}) {
  return (
    <View style={[styles.section, highlight && styles.sectionHighlight]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color="#6B7FD7" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{content}</Text>
      {quotes?.map((quote, index) => (
        <View key={index} style={styles.quoteContainer}>
          <Text style={styles.quoteText}>"{quote}"</Text>
        </View>
      ))}
    </View>
  );
}
```

### Pattern 5: Onboarding Questionnaire Wizard

**What:** Multi-step form for attachment style and goal selection
**When to use:** ONBD-01 (relationship assessment), ONBD-02 (goal selection)

```typescript
// src/features/onboarding/components/QuestionnaireWizard.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const onboardingSchema = z.object({
  // Attachment style questions (simplified ECR-R inspired)
  attachmentAnxiety: z.number().min(1).max(5),
  attachmentAvoidance: z.number().min(1).max(5),
  conflictStyle: z.enum(['avoid', 'confront', 'collaborate', 'compromise']),
  communicationFrequency: z.enum(['daily', 'weekly', 'rarely']),
  // Goals
  primaryGoal: z.enum(['prevention', 'improvement', 'crisis']),
  focusAreas: z.array(z.string()).min(1).max(3),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 'attachment', title: '소통 스타일' },
  { id: 'conflict', title: '갈등 대응' },
  { id: 'goals', title: '목표 설정' },
];

export function QuestionnaireWizard({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const { control, handleSubmit, formState: { errors } } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      focusAreas: [],
    },
  });

  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const onSubmit = (data: OnboardingData) => {
    onComplete(data);
  };

  return (
    <View style={styles.container}>
      <ProgressBar current={currentStep + 1} total={STEPS.length} />
      <Text style={styles.stepTitle}>{STEPS[currentStep].title}</Text>

      {currentStep === 0 && (
        <AttachmentStyleStep control={control} errors={errors} />
      )}
      {currentStep === 1 && (
        <ConflictStyleStep control={control} errors={errors} />
      )}
      {currentStep === 2 && (
        <GoalSelectionStep control={control} errors={errors} />
      )}

      <View style={styles.navigation}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backText}>이전</Text>
          </TouchableOpacity>
        )}
        {currentStep < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={goNext}>
            <Text style={styles.nextText}>다음</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleSubmit(onSubmit)}>
            <Text style={styles.nextText}>완료</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Individual step components follow similar pattern with Controller from react-hook-form
```

### Anti-Patterns to Avoid

- **Sending full chat history to Claude every time:** Exceeds context window, increases cost. Use rolling summarization.
- **Blocking UI during AI response:** Always use streaming; show typing indicator.
- **Storing AI prompts in mobile app:** Keep system prompts server-side for security and easy updates.
- **Using sync views for streaming:** Must use async views with ASGI server (Daphne) for proper streaming.
- **Allowing reframing modal close without acknowledgment:** Per CONTEXT.md, user must tap "I've read this".
- **Inline reframing in chat:** Per CONTEXT.md, reframing displays in separate modal/view.

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat UI components | Custom FlatList chat | react-native-gifted-chat | Message bubbles, timestamps, input, typing indicators all handled |
| SSE parsing | Manual EventSource | fetch + ReadableStream | React Native doesn't have EventSource; manual parsing is simple |
| Context window management | Truncating messages | Rolling summarization | Preserves context/personality while staying within limits |
| Form validation | Manual validation | zod + react-hook-form | Type-safe, declarative, handles edge cases |
| Typing animation | Custom animation | react-native-typing-animation | Simple, performant, drop-in |
| AI response streaming | Polling | SSE via StreamingHttpResponse | Real-time UX, lower latency than polling |

**Key insight:** Chat UX has many subtle edge cases (scroll position, keyboard handling, message ordering). react-native-gifted-chat handles all of these. Context management for LLMs is an active research area - rolling summarization is well-established pattern.

---

## Common Pitfalls

### Pitfall 1: WSGI Server Blocking on Streaming Responses

**What goes wrong:** Streaming works locally but times out in production
**Why it happens:** WSGI servers (gunicorn sync workers) block on streaming responses
**How to avoid:** Always use ASGI server (Daphne) for streaming endpoints; already configured in Phase 1
**Warning signs:** 30-second timeouts, incomplete responses

### Pitfall 2: Context Window Exceeded

**What goes wrong:** Claude returns error or truncated response
**Why it happens:** Conversation history + system prompt exceeds model context window
**How to avoid:** Implement context manager with summarization; monitor token usage
**Warning signs:** API errors, responses that seem to "forget" earlier context

### Pitfall 3: Race Condition on Message State

**What goes wrong:** Messages appear out of order or duplicate
**Why it happens:** Optimistic updates conflict with server responses
**How to avoid:** Use unique message IDs; reconcile server response with local state
**Warning signs:** Duplicate messages, wrong timestamps, messages jumping position

### Pitfall 4: Stream Interruption Without Recovery

**What goes wrong:** Partial AI responses with no completion
**Why it happens:** Network interruption during SSE stream
**How to avoid:** Implement AbortController cleanup; handle partial responses gracefully; show retry option
**Warning signs:** Incomplete AI messages, hanging loading states

### Pitfall 5: Judgmental AI Responses

**What goes wrong:** AI takes sides or assigns blame despite guardrails
**Why it happens:** Insufficient system prompt constraints; user manipulation attempts
**How to avoid:** Robust system prompts; output validation; graduated response to edge cases
**Warning signs:** User complaints about bias; responses containing "you're right/wrong"

### Pitfall 6: FlatList Performance with Long Chat History

**What goes wrong:** UI stutters, slow scrolling, high memory usage
**Why it happens:** Not using virtualization props; loading all messages at once
**How to avoid:** Set `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`; paginate history
**Warning signs:** Laggy scrolling after 100+ messages; memory warnings

---

## Code Examples

### System Prompt for Non-Judgmental Reframing

```python
# apps/chat/prompts/system_prompts.py

REFRAMING_SYSTEM_PROMPT = """당신은 커플 관계 코치입니다. 사용자가 파트너와의 갈등 상황을 설명하면, 관점 전환(리프레이밍)을 통해 상호 이해를 돕습니다.

## 핵심 원칙

1. **절대 판단하지 않음**: "누가 맞다/틀리다", "당신이 잘못했다", "상대방이 나쁘다" 등의 표현 금지
2. **양방향 관점 제시**:
   - "당신이 말한 것이 상대방에게 어떻게 들렸을 수 있는지"
   - "상대방이 말한 것을 당신이 어떻게 해석했을 수 있는지"
3. **구체적 행동 제안**: 추상적 조언 대신 바로 실행할 수 있는 구체적 행동 제시
4. **감정 인정 우선**: 분석 전에 사용자의 감정을 먼저 인정하고 공감

## 응답 구조

다음 구조로 응답하세요:

### 당신이 말한 것
[사용자 메시지에서 핵심 표현 인용]

### 상대방이 들었을 수 있는 것
[동일한 말이 상대방 관점에서 어떻게 해석될 수 있는지]

### 왜 이런 차이가 생겼을까요
[소통 방식, 과거 경험, 감정 상태 등 차이의 원인 분석]

### 다음에 시도해볼 것
[1-3개의 구체적이고 실행 가능한 행동 제안]

## 금지 사항

- "상대방이 잘못했네요", "당신 말이 맞아요" 등 판단
- "항상", "절대", "모든" 등 절대적 표현
- 관계를 끝내라는 조언 (학대 상황 제외)
- 전문 상담 없이 심리 진단

## 학대 패턴 감지 시

폭력, 통제, 고립 등 학대 신호 감지 시:
1. 먼저 사용자 안전 확인
2. 전문 상담 자원 안내 (1366 여성긴급전화 등)
3. 판단 없이 사용자 선택 존중

## 언어

한국어로 응답하세요. 격식체("~입니다", "~세요")를 사용하되 따뜻하고 지지적인 톤을 유지하세요."""


AI_THINKING_MESSAGES = [
    "상대방 관점을 분석하고 있어요...",
    "양측의 감정을 이해하고 있어요...",
    "소통 패턴을 살펴보고 있어요...",
    "구체적인 제안을 준비하고 있어요...",
]
```

### Message Model with Encryption

```python
# apps/chat/models.py
import uuid
from django.db import models
from django.conf import settings
from fernet_fields.fields import EncryptedTextField

class Conversation(models.Model):
    """A conversation thread for a user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True, blank=True  # Solo users before partner connection
    )
    title = models.CharField(max_length=200, blank=True)  # Auto-generated from first message
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']


class Message(models.Model):
    """Individual message in a conversation."""

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = EncryptedTextField()  # Encrypted sensitive content

    # For reframing responses
    has_reframing = models.BooleanField(default=False)
    reframing_data = models.JSONField(null=True, blank=True)  # Structured reframing

    # Metadata
    token_count = models.IntegerField(null=True)  # For context management
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    @property
    def is_user(self) -> bool:
        return self.role == self.Role.USER


class ConversationSummary(models.Model):
    """Rolling summary of older messages for context management."""

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='summaries'
    )
    summary_text = EncryptedTextField()
    message_count = models.IntegerField()  # Number of messages summarized
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversation_summaries'
        ordering = ['-created_at']


class SharedReframing(models.Model):
    """Reframing shared with partner."""

    class PrivacyLevel(models.TextChoices):
        FULL = 'full', 'Full (original + reframing)'
        SUMMARY = 'summary', 'Summary only'
        NONE = 'none', 'Not shared'

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='shares'
    )
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shared_reframings'
    )
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_reframings'
    )
    privacy_level = models.CharField(
        max_length=20,
        choices=PrivacyLevel.choices,
        default=PrivacyLevel.FULL
    )
    partner_response = EncryptedTextField(null=True, blank=True)
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shared_reframings'
```

### Partner Sharing via WebSocket

```python
# apps/chat/consumers.py (extending existing consent consumer pattern)
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time chat updates and sharing."""

    async def connect(self):
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Get user's couple for group membership
        self.couple = await self.get_active_couple()

        if self.couple:
            self.couple_group = f'couple_{self.couple.id}'
            await self.channel_layer.group_add(self.couple_group, self.channel_name)

        # Personal notification group
        self.user_group = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'couple_group'):
            await self.channel_layer.group_discard(self.couple_group, self.channel_name)
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive_json(self, content):
        action = content.get('action')

        if action == 'share_reframing':
            await self.handle_share_reframing(content)
        elif action == 'respond_to_share':
            await self.handle_share_response(content)

    async def handle_share_reframing(self, content):
        """Handle sharing reframing with partner."""
        message_id = content.get('message_id')
        privacy_level = content.get('privacy_level', 'full')

        share = await self.create_share(message_id, privacy_level)

        # Notify partner
        await self.channel_layer.group_send(
            self.couple_group,
            {
                'type': 'reframing_shared',
                'share_id': str(share.id),
                'shared_by': self.user.id,
                'privacy_level': privacy_level,
            }
        )

    # Event handlers
    async def reframing_shared(self, event):
        """Send shared reframing notification to partner."""
        if event['shared_by'] != self.user.id:  # Don't send to sharer
            await self.send_json({
                'type': 'reframing_shared',
                'share_id': event['share_id'],
                'privacy_level': event['privacy_level'],
            })

    async def partner_responded(self, event):
        """Send partner response notification."""
        await self.send_json(event)

    @database_sync_to_async
    def get_active_couple(self):
        from apps.couples.models import Couple
        return Couple.objects.filter(
            models.Q(user1=self.user) | models.Q(user2=self.user),
            status=Couple.Status.ACTIVE
        ).first()

    @database_sync_to_async
    def create_share(self, message_id, privacy_level):
        from apps.chat.models import Message, SharedReframing
        message = Message.objects.get(id=message_id)
        partner = self.couple.get_partner(self.user)
        return SharedReframing.objects.create(
            message=message,
            shared_by=self.user,
            shared_with=partner,
            privacy_level=privacy_level,
        )
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full history in prompt | Rolling summarization | 2024+ | Enables "infinite" chat without context overflow |
| Polling for AI responses | SSE/WebSocket streaming | 2023+ | Real-time UX, reduced latency |
| Single perspective | Bidirectional reframing | Novel for app | More balanced, less adversarial |
| Static prompts | Dynamic context-aware prompts | 2024+ | Better personalization |
| Basic chat UI | Structured reframing modal | Novel for app | Better comprehension, required acknowledgment |

**Deprecated/outdated:**
- **expo-av for audio:** Deprecated in SDK 53, but not relevant for this phase (Phase 3)
- **Manual EventSource polyfills:** fetch + ReadableStream is cleaner for React Native
- **Sending raw HTML to Claude:** JSON structured output preferred for reframing

---

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal summarization frequency**
   - What we know: Summarize when exceeding ~10-20 messages
   - What's unclear: Best balance between context preservation and cost
   - Recommendation: Start with 10-message threshold, tune based on user feedback

2. **Reframing regeneration limits**
   - What we know: Users can request "guided regenerate" with feedback
   - What's unclear: How many regenerations before it becomes problematic
   - Recommendation: Allow 3 regenerations per reframing, then offer to start new conversation

3. **Breakthrough detection for auto-sharing**
   - What we know: Per CONTEXT.md, "genuine perspective shifts" auto-share
   - What's unclear: How to reliably detect "genuine" shift vs. surface agreement
   - Recommendation: Look for specific language patterns ("I hadn't thought of it that way", "I understand now"); require confidence threshold

4. **Token cost management**
   - What we know: Claude Sonnet costs ~$3/1M input tokens
   - What's unclear: Per-user cost at scale with summarization overhead
   - Recommendation: Track token usage per conversation; implement soft daily limits if needed

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Claude Streaming Documentation](https://platform.claude.com/docs/en/build-with-claude/streaming) - Official streaming API reference
- [Django Channels Documentation](https://channels.readthedocs.io/) - WebSocket patterns
- [react-native-gifted-chat GitHub](https://github.com/FaridSafi/react-native-gifted-chat) - Chat UI library
- [Django StreamingHttpResponse](https://blog.pecar.me/django-streaming-responses) - Async streaming patterns

### Secondary (MEDIUM confidence)
- [LLM Chat History Summarization Guide](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025) - Context management patterns
- [React Native FlatList Optimization](https://github.com/anisurrahman072/React-Native-Advanced-Guide/blob/master/List-and-Virtualization/All-ListView-and-Virtualization-Optimization.md) - Performance patterns
- [SaaS Pegasus Django WebSocket ChatGPT Guide](https://www.saaspegasus.com/guides/django-websockets-chatgpt-channels-htmx/) - Django + AI streaming patterns
- [React Native Typing Animation](https://github.com/watadarkstar/react-native-typing-animation) - Typing indicator library

### Tertiary (LOW confidence)
- WebSearch results for AI therapy chatbot safety guardrails
- WebSearch results for multi-step form wizard patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries well-documented, widely used
- Architecture patterns: HIGH - Based on official docs and proven patterns
- Claude integration: HIGH - Official SDK documentation
- Safety guardrails: MEDIUM - Based on research, needs validation with real users
- Context management: MEDIUM - Established pattern, parameters need tuning

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, Claude API may update)
