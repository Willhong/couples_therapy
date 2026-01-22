# Technology Stack

**Project:** AI Couples Therapy Mobile App
**Researched:** 2026-01-23
**Overall Confidence:** HIGH

---

## Executive Summary

This stack is optimized for building a privacy-critical AI therapy app with audio recording and LLM-powered reframing. Key decisions:

1. **Expo SDK 53+** - De-facto standard for React Native in 2025, New Architecture enabled by default
2. **expo-audio** (not expo-av) - New stable audio API as of SDK 53
3. **expo-secure-store** - Native keychain/keystore encryption for sensitive data
4. **Supabase** - PostgreSQL-based BaaS with Row-Level Security for therapy data
5. **Anthropic Claude API** - Best-in-class for nuanced therapy/relationship contexts with streaming support
6. **OpenAI Whisper API** - Cost-effective transcription at $0.006/min with speaker diarization

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Expo** | SDK 53+ (React Native 0.79) | App framework | De-facto standard with official RN recommendation. New Architecture enabled by default (74.6% adoption). Streamlined development with EAS Build/Submit. | HIGH |
| **React** | 19.x | UI library | Ships with Expo SDK 53. Breaking changes from v18 but necessary for modern patterns. | HIGH |
| **TypeScript** | 5.x | Type safety | Essential for complex therapy/AI logic. Expo has first-class TS support. | HIGH |
| **Expo Router** | v4+ | Navigation | File-based routing, web developer friendly, deep linking support for notifications. Automatic upgrade with React Navigation v7. | HIGH |

**Why Expo over bare React Native:**
- Official recommendation from React Native documentation
- expo-audio is the only stable audio recording solution in 2025 (expo-av deprecated in SDK 53)
- expo-secure-store provides native encryption without native code
- EAS Build eliminates CI/CD complexity
- 74.6% of production apps now use New Architecture via Expo

### Styling & UI

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **NativeWind** | v4.1+ | Styling | Tailwind CSS for React Native. Compiles to native StyleSheet at build time. Main styling choice in 2025. | HIGH |
| **Tailwind CSS** | ^3.4.17 | Utility classes | Required peer dependency for NativeWind | HIGH |
| **Gluestack UI v3** | Latest | Component library | Modular, unstyled, accessible components that work with NativeWind. Replaced NativeBase. | MEDIUM |
| **React Native Reanimated** | ~3.17+ | Animations | Required by NativeWind. Reanimated 4 adds CSS Animations support. Top choice for fluid animations. | HIGH |

**Why NativeWind over styled-components/StyleSheet:**
- Tailwind familiarity for web developers
- Build-time compilation = no runtime overhead
- Consistent styling patterns across web/native
- Theming for dark mode support (important for therapy app UX)

### State Management

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Zustand** | 5.x | Client state | Simple, minimal boilerplate, hook-based. Handles zombie child problem and React concurrency correctly. | HIGH |
| **TanStack Query** | v5 | Server state | Caching, background refetch, offline support. Standard for server state in 2025. | HIGH |
| **@react-native-async-storage/async-storage** | Latest | Persistence | For Zustand persist middleware (non-sensitive data only) | HIGH |

**State Architecture:**
```
Server State (TanStack Query) <-> API
         |
Client State (Zustand) <-> UI
         |
Persistence (AsyncStorage for non-sensitive, SecureStore for sensitive)
```

**CRITICAL:** Do NOT store sensitive therapy data or audio URIs in AsyncStorage-persisted Zustand. Use expo-secure-store for any PII/PHI.

### Data Fetching & API

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **TanStack Query** | v5 | Data fetching | Caching, deduplication, background sync. Works with React Native out of box. | HIGH |
| **expo/fetch** | SDK 53+ | HTTP client | WinterCG-compliant, supports download streaming for AI APIs. Drop-in replacement. | HIGH |

**For Offline Support:**
- Use `PersistQueryClientProvider` with custom persistor
- Implement `NetInfo.addEventListener` for online state (required on mobile, automatic in browser)
- Use `setQueryData` for optimistic updates when offline

### Backend & Database

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Supabase** | Latest | BaaS | PostgreSQL-based, Row-Level Security for therapy data isolation, open-source, predictable pricing. | HIGH |
| **Supabase Auth** | Built-in | Authentication | Social login (Apple, Google), phone auth, MFA. Integrates with RLS policies. | HIGH |
| **Supabase Storage** | Built-in | Audio storage | Encrypted at rest, signed URLs, row-level policies for audio file access. | HIGH |
| **Supabase Edge Functions** | Deno | Server logic | For LLM API calls (keeps API keys server-side), audio processing triggers. | HIGH |

**Why Supabase over Firebase:**
- **PostgreSQL vs NoSQL:** Therapy data has clear relationships (users, conversations, recordings, analyses). SQL joins are essential.
- **Row-Level Security:** SQL-based policies for HIPAA-grade data isolation. Firebase requires more complex security rules.
- **Predictable pricing:** Charges by storage, not read/write operations. Critical for high-frequency chat apps.
- **Open-source:** Can self-host for maximum privacy compliance if needed.
- **BAA available:** Supabase offers HIPAA BAA for healthcare compliance.

### Audio Recording & Processing

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **expo-audio** | SDK 53+ | Audio recording | NEW stable API in SDK 53. Replaces deprecated expo-av. More reliable, performant. | HIGH |
| **expo-file-system** | SDK 53+ | File handling | Moving/copying audio files before upload | HIGH |

**Recording Configuration:**
```typescript
import { useAudioRecorder, RecordingPresets } from 'expo-audio';

// High quality for transcription
const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

// iOS: AVAudioRecorder with LINEAR16 at 41000Hz works best with Whisper
// Android: Use "camcorder" source for conflict recording scenarios
```

**CRITICAL Migration Note:** expo-av is deprecated and will be removed in SDK 55. All audio code must use expo-audio.

### Speech-to-Text / Transcription

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **OpenAI Whisper API** | gpt-4o-transcribe | Primary transcription | $0.006/min, speaker diarization support, 4x cheaper than Google Cloud. | HIGH |
| **OpenAI GPT-4o Mini Transcribe** | gpt-4o-mini-audio | Budget option | $0.003/min for cost-sensitive scenarios | MEDIUM |

**Transcription Architecture:**
1. Record audio locally with expo-audio
2. Upload to Supabase Storage (encrypted)
3. Trigger Edge Function to call Whisper API
4. Store transcript with speaker labels in PostgreSQL
5. Trigger LLM analysis

**Pricing at scale:**
- 1,000 minutes = $6 (vs $24 Google, $24 AWS)
- 10 hours/day average = ~$1.80/day per active couple
- Consider caching/batching for high-volume users

**Alternative for offline/privacy:** Picovoice Leopard for on-device transcription (no cloud), but requires native module setup.

### AI / LLM Integration

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Anthropic Claude API** | claude-3.5-sonnet or claude-3-opus | Reframing analysis | Best nuanced understanding for relationship/emotional contexts. Streaming support for real-time responses. | HIGH |
| **@anthropic-ai/sdk** | Latest | SDK | Official TypeScript SDK with streaming support. | HIGH |

**Why Claude over GPT-4:**
- Superior at nuanced emotional/relationship understanding
- Better at "perspective-taking" which is core to reframing
- Streaming responses work well for chat UX
- Claude's helpful assistant persona fits therapy context

**Implementation Pattern:**
```typescript
// Call from Supabase Edge Function (keeps API key server-side)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Streaming for real-time feedback
const stream = client.messages.stream({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: transcriptWithContext }],
});

for await (const chunk of stream) {
  // Stream to client via Supabase Realtime
}
```

**CRITICAL:** Never embed API keys in mobile app. All LLM calls go through Supabase Edge Functions.

### Secure Storage & Privacy

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **expo-secure-store** | SDK 53+ | Sensitive data | iOS Keychain, Android EncryptedSharedPreferences. Official Expo solution. | HIGH |
| **Supabase RLS** | Built-in | Data isolation | Row-level security ensures couples can only access their own data. | HIGH |
| **react-native-mmkv** | Latest | Fast KV storage | For non-sensitive app preferences. 30x faster than AsyncStorage. | MEDIUM |

**Storage Decision Matrix:**
| Data Type | Storage | Encryption |
|-----------|---------|------------|
| Auth tokens | expo-secure-store | Hardware-backed |
| User preferences | MMKV or AsyncStorage | None needed |
| Audio recordings | Supabase Storage | At-rest + signed URLs |
| Transcripts | Supabase PostgreSQL | At-rest + RLS |
| API keys | Supabase Edge Functions | Never on device |

**HIPAA/Privacy Considerations:**
- All therapy content is PHI (Protected Health Information)
- Supabase offers BAA (Business Associate Agreement) for HIPAA compliance
- Audio recordings must be encrypted in transit (HTTPS) and at rest
- Implement audit logs for all data access
- Consider data retention policies (auto-delete after X days option)

### Testing

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Maestro** | Latest | E2E/UI testing | Cross-platform, easy to set up, visual testing | HIGH |
| **React Native Testing Library** | Latest | Unit tests | Component testing with user-centric queries | HIGH |
| **Jest** | Latest | Test runner | Standard for React ecosystem | HIGH |

### Development Tools

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **EAS Build** | Latest | CI/CD | Expo Application Services. Cloud builds, OTA updates. | HIGH |
| **EAS Submit** | Latest | Store deployment | Automated App Store/Play Store submission | HIGH |
| **React Native DevTools** | SDK 53+ | Debugging | Replaces old JS debugger. New in SDK 52+. | HIGH |

---

## Alternatives Considered (and Why Not)

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Framework | Expo | Bare RN | expo-audio is only stable option; EAS simplifies everything |
| Backend | Supabase | Firebase | NoSQL poor fit for relational therapy data; Firebase pricing unpredictable |
| Transcription | Whisper API | Google STT | 4x more expensive; Whisper quality comparable |
| Transcription | Whisper API | Picovoice | Requires native modules; more setup complexity |
| LLM | Claude | GPT-4 | Claude better at emotional nuance and perspective-taking |
| State | Zustand | Redux | Overkill for this app size; more boilerplate |
| Styling | NativeWind | Styled-components | Build-time vs runtime; Tailwind more familiar |
| Secure Storage | expo-secure-store | react-native-keychain | expo-secure-store is official, works in Expo Go |

---

## Installation Commands

```bash
# Create Expo project
npx create-expo-app@latest couples-therapy --template default

# Core dependencies
npx expo install expo-router expo-audio expo-secure-store expo-file-system

# Styling
npm install nativewind react-native-reanimated react-native-safe-area-context
npm install --save-dev tailwindcss@^3.4.17 prettier-plugin-tailwindcss

# State management
npm install zustand @tanstack/react-query
npx expo install @react-native-async-storage/async-storage

# Backend
npm install @supabase/supabase-js

# AI
npm install @anthropic-ai/sdk  # For Edge Functions, not mobile app

# Fast storage
npm install react-native-mmkv

# Network status (for offline support)
npx expo install @react-native-community/netinfo

# UI Components (optional)
npm install @gluestack-ui/themed
```

---

## Configuration Files

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Therapy app calming palette
        primary: '#6B7FD7',
        secondary: '#9BA8C9',
        accent: '#F5C77E',
        background: '#F8F9FA',
        surface: '#FFFFFF',
      },
    },
  },
  plugins: [],
}
```

### babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

### metro.config.js
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

---

## Security Checklist

- [ ] API keys NEVER in mobile app code
- [ ] All LLM/transcription calls through Supabase Edge Functions
- [ ] expo-secure-store for tokens and sensitive metadata
- [ ] Supabase RLS policies for all tables
- [ ] Audio files with signed URLs (time-limited access)
- [ ] Audit logging for all PHI access
- [ ] Data deletion flow for user account removal
- [ ] Encryption in transit (HTTPS) and at rest
- [ ] Consider HIPAA BAA with Supabase

---

## Version Compatibility Matrix

| Package | Minimum Version | Tested With | Notes |
|---------|-----------------|-------------|-------|
| Expo SDK | 53 | 53 | Required for stable expo-audio |
| React Native | 0.79 | 0.79 | Ships with SDK 53 |
| React | 19.x | 19.1 | Breaking changes from v18 |
| NativeWind | 4.1 | 4.1 | v5 in preview, not stable |
| TanStack Query | 5.x | 5.x | v4 works but v5 recommended |
| Supabase JS | 2.x | 2.x | v2 has better TypeScript |

---

## Sources

### Official Documentation (HIGH confidence)
- [Expo SDK 53 Changelog](https://expo.dev/changelog/sdk-53)
- [expo-audio Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [expo-secure-store Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Anthropic SDK GitHub](https://github.com/anthropics/anthropic-sdk-python)
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation)
- [TanStack Query React Native Offline](https://tanstack.com/query/v4/docs/framework/react/examples/offline)

### Industry Research (MEDIUM confidence)
- [React Native Tech Stack 2025 - Galaxies.dev](https://galaxies.dev/article/react-native-tech-stack-2025)
- [Supabase vs Firebase 2025 - Zapier](https://zapier.com/blog/supabase-vs-firebase/)
- [OpenAI Whisper API Pricing - BrassTranscripts](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)
- [Mental Health App HIPAA Compliance - SecurePrivacy](https://secureprivacy.ai/blog/mental-health-app-data-privacy-hipaa-gdpr-compliance)
- [LLM Integration Mobile Apps 2025 - TheUsefulApps](https://www.theusefulapps.com/news/integrating-llms-mobile-challenges-best-practices-2025)

### Community Resources (LOW-MEDIUM confidence)
- [Zustand State Management Guide](https://javascript.plainenglish.io/mastering-state-management-in-react-native-with-zustand-a-modern-guide-d6fb2764cdcb)
- [React Native Speech Recognition 2025 - Picovoice](https://picovoice.ai/blog/react-native-speech-recognition/)
