# Phase 1: Foundation & Safety - Research

**Researched:** 2026-01-23
**Domain:** Authentication, Partner Connection, Data Encryption, Legal Compliance (Korea)
**Confidence:** HIGH

---

## Summary

Phase 1 establishes secure authentication, partner linking, and legal safeguards for a couples therapy app targeting Korean users. The stack is well-defined: Supabase Auth for email/password authentication with expo-secure-store for encrypted session storage, Supabase RLS for partner data isolation, and deep linking for partner invitation codes.

Key findings:
- **Supabase Auth** works seamlessly with Expo, but requires a custom storage adapter for secure session persistence (expo-secure-store has 2KB limit)
- **Partner connection** should use a database-backed invite code system with 24-hour expiration and both code + deep link options
- **Korean recording law** (통신비밀보호법) allows one-party consent for recording, but the app's ethical position mandates dual consent for relationship safety
- **Coach mark tutorials** are well-supported by react-native-copilot with Expo SDK 53 compatibility

**Primary recommendation:** Use Supabase Auth with a hybrid storage approach (expo-secure-store for tokens, expo-sqlite/localStorage for larger session data) and implement partner linking via invite codes stored in Supabase with RLS policies for couple data isolation.

---

## Standard Stack

### Core Authentication & Security

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@supabase/supabase-js** | 2.x | Authentication & Database | Official SDK, built-in email/password auth, session management, integrates with RLS |
| **expo-secure-store** | SDK 53+ | Sensitive token storage | Hardware-backed encryption (iOS Keychain, Android Keystore), official Expo solution |
| **expo-sqlite** | SDK 53+ | Session data storage | For larger auth data that exceeds SecureStore 2KB limit, localStorage polyfill |
| **expo-linking** | SDK 53+ | Deep linking | Partner invite links, URL parsing, scheme handling |

### Onboarding & Tutorial

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **react-native-copilot** | 3.x+ | Coach mark tutorial | 2.4k GitHub stars, Expo compatible, SVG overlay with smooth animations |
| **react-native-svg** | SDK 53+ | SVG rendering | Required by copilot for overlay, included in Expo |

### UI Components

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@react-native-community/checkbox** | Latest | Disclaimer checkbox | Deprecated built-in, use community package |
| **NativeWind** | 4.1+ | Styling | Already in stack, use for form styling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-secure-store | react-native-mmkv with encryption | MMKV faster but requires additional encryption setup; SecureStore is simpler |
| expo-sqlite localStorage | AsyncStorage | AsyncStorage is unencrypted; not recommended for auth data |
| react-native-copilot | @blazejkustra/react-native-onboarding | Onboarding is for swipe screens, not coach marks; Copilot better for in-app tour |

**Installation:**
```bash
# Core authentication
npx expo install @supabase/supabase-js expo-secure-store expo-sqlite expo-linking

# Tutorial/onboarding
npm install react-native-copilot
npx expo install react-native-svg

# Checkbox (for disclaimer)
npm install @react-native-community/checkbox
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── supabase.ts          # Supabase client with secure storage adapter
│   └── storage.ts           # Hybrid storage adapter implementation
├── hooks/
│   ├── useAuth.ts           # Authentication state and methods
│   ├── usePartner.ts        # Partner connection state
│   └── useOnboarding.ts     # Onboarding progress tracking
├── screens/
│   ├── auth/
│   │   ├── SignUpScreen.tsx # Email/password signup with disclaimer
│   │   ├── SignInScreen.tsx # Login screen
│   │   └── components/
│   │       └── DisclaimerCheckbox.tsx
│   ├── onboarding/
│   │   ├── PartnerLinkScreen.tsx   # Invite code generation/entry
│   │   └── TutorialScreen.tsx      # Coach mark tour wrapper
│   └── recording/
│       └── ConsentModal.tsx  # Dual consent recording UI
├── components/
│   ├── onboarding/
│   │   └── ProgressBar.tsx   # Onboarding progress indicator
│   └── consent/
│       └── DualConsentPrompt.tsx
└── utils/
    ├── inviteCode.ts         # Code generation/validation
    └── deepLink.ts           # Link parsing utilities
```

### Pattern 1: Hybrid Secure Storage Adapter

**What:** Custom storage adapter combining expo-secure-store for tokens and expo-sqlite for larger session data
**When to use:** Always for Supabase Auth in production apps
**Why:** expo-secure-store has 2KB limit; OAuth sessions can exceed this

```typescript
// lib/storage.ts
import * as SecureStore from 'expo-secure-store';
import 'expo-sqlite/localStorage/install';

const LARGE_VALUE_THRESHOLD = 1800; // bytes, under 2KB limit

export const HybridSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Try SecureStore first
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;

      // Fall back to localStorage for large values
      return localStorage.getItem(key);
    } catch {
      return localStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const byteSize = new Blob([value]).size;

    if (byteSize < LARGE_VALUE_THRESHOLD) {
      // Small values go to SecureStore
      await SecureStore.setItemAsync(key, value);
    } else {
      // Large values go to localStorage (still encrypted at rest by SQLite)
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
    localStorage.removeItem(key);
  },
};
```

### Pattern 2: Supabase Client with Secure Storage

**What:** Configure Supabase client with hybrid storage and app state handling
**When to use:** Client initialization

```typescript
// lib/supabase.ts
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { HybridSecureStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: HybridSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Handle app state for token refresh
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
```

### Pattern 3: Partner Invite Code System

**What:** Database schema and logic for 6-digit invite codes with expiration
**When to use:** Partner connection feature

```sql
-- Supabase SQL for invite codes table
CREATE TABLE invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) NOT NULL UNIQUE,
  creator_id UUID REFERENCES auth.users(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookup
CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- RLS policies
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own codes
CREATE POLICY "Users can view own codes" ON invite_codes
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR used_by = auth.uid());

-- Users can create codes
CREATE POLICY "Users can create codes" ON invite_codes
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Function to generate unique 6-digit code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  code VARCHAR(6) := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// utils/inviteCode.ts
export async function createInviteCode(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .rpc('generate_invite_code')
    .single();

  if (error) throw error;

  const code = data as string;

  await supabase.from('invite_codes').insert({
    code,
    creator_id: (await supabase.auth.getUser()).data.user?.id,
  });

  return code;
}

export async function validateInviteCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ valid: boolean; creatorId?: string }> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('creator_id, expires_at, used_by')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return { valid: false };
  if (data.used_by) return { valid: false }; // Already used
  if (new Date(data.expires_at) < new Date()) return { valid: false }; // Expired

  return { valid: true, creatorId: data.creator_id };
}
```

### Pattern 4: Couples RLS Pattern

**What:** Row-level security for partner data isolation
**When to use:** All tables containing couple-specific data

```sql
-- Couples/Relationships table
CREATE TABLE couples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) NOT NULL,
  user2_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, disconnected
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Users can see couples they're part of
CREATE POLICY "Users see own couples" ON couples
  FOR SELECT TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Helper function to get partner's couple_id
CREATE OR REPLACE FUNCTION get_couple_id()
RETURNS UUID AS $$
  SELECT id FROM couples
  WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
  AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Example: Recordings table with couple isolation
CREATE TABLE recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID REFERENCES couples(id) NOT NULL,
  -- ... other fields
);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples see own recordings" ON recordings
  FOR ALL TO authenticated
  USING (couple_id = get_couple_id());
```

### Pattern 5: Deep Link for Partner Invite

**What:** Deep link configuration and handling for invite links
**When to use:** Partner invitation via shared link

```json
// app.json
{
  "expo": {
    "scheme": "couplesai",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "couplesai", "host": "invite" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "associatedDomains": ["applinks:couplesai.app"]
    }
  }
}
```

```typescript
// utils/deepLink.ts
import * as Linking from 'expo-linking';

export function createInviteLink(code: string): string {
  return Linking.createURL('invite', {
    queryParams: { code },
  });
  // Returns: couplesai://invite?code=ABC123
}

export function parseInviteLink(url: string): string | null {
  const { hostname, queryParams } = Linking.parse(url);
  if (hostname === 'invite' && queryParams?.code) {
    return queryParams.code as string;
  }
  return null;
}

// Hook to handle incoming links
export function useInviteLink() {
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      const code = parseInviteLink(url);
      if (code) {
        // Navigate to partner link screen with code
        router.push({ pathname: '/onboarding/partner-link', params: { code } });
      }
    }
  }, [url]);
}
```

### Anti-Patterns to Avoid

- **Storing auth tokens in AsyncStorage:** Unencrypted, accessible to anyone with device access. Always use SecureStore or encrypted storage.
- **Hardcoding Supabase keys in app code:** Use environment variables via `EXPO_PUBLIC_` prefix.
- **RLS policies without enabling RLS:** Tables are public by default. Always `ALTER TABLE x ENABLE ROW LEVEL SECURITY` first.
- **Checking partner access in app code only:** Defense-in-depth requires RLS at database level, not just app logic.
- **Storing invite codes without expiration:** Creates security risk. Always set `expires_at` and clean up old codes.

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session encryption | Custom encryption layer | expo-secure-store | Hardware-backed, OS-maintained keys, can't access from outside app |
| Token refresh | Manual refresh logic | Supabase `autoRefreshToken: true` | Handles edge cases, app state changes, race conditions |
| Code uniqueness | Application-level uniqueness check | Database unique constraint + retry | Race conditions, distributed systems need DB-level enforcement |
| Partner data isolation | `WHERE user_id = X OR partner_id = X` everywhere | Supabase RLS policies | Single point of truth, can't bypass at application level |
| Coach mark positioning | Manual element measurement | react-native-copilot | Handles scroll views, keyboard, orientation changes |
| Deep link parsing | Regex on URL strings | expo-linking `parse()` | Handles edge cases, URL encoding, query params |

**Key insight:** Security features (encryption, data isolation, token management) must be handled by battle-tested libraries. Custom implementations invariably have edge cases that lead to vulnerabilities.

---

## Common Pitfalls

### Pitfall 1: SecureStore 2KB Limit

**What goes wrong:** OAuth sessions (Google, Apple) often exceed 2KB, causing silent failures or crashes on SDK 35+
**Why it happens:** SecureStore designed for small tokens, not full session objects
**How to avoid:** Use hybrid storage pattern (SecureStore for small data, expo-sqlite for large)
**Warning signs:** "Provided value to SecureStore is larger than 2048 bytes" warning

### Pitfall 2: RLS Not Enabled

**What goes wrong:** All data publicly accessible, even with policies defined
**Why it happens:** Supabase creates tables with RLS disabled by default
**How to avoid:** Always run `ALTER TABLE x ENABLE ROW LEVEL SECURITY` before creating policies
**Warning signs:** Users can see other users' data; 170+ apps exposed in CVE-2025-48757

### Pitfall 3: Offline Session Loss

**What goes wrong:** Users logged out when app starts offline
**Why it happens:** `startAutoRefresh()` tries to refresh while offline, clears session on failure
**How to avoid:** Only call `startAutoRefresh()` when app has network connectivity
**Warning signs:** Session works when online, disappears after offline app restart

### Pitfall 4: Deep Link Not Working After Install

**What goes wrong:** Partner invite links don't open app, go to browser instead
**Why it happens:** Deep links require app to be installed; URL scheme not registered
**How to avoid:** Test with development build (not Expo Go), implement universal links for uninstalled case
**Warning signs:** Links work in Expo Go but not production build

### Pitfall 5: Invite Code Collisions

**What goes wrong:** Two users get same invite code, one overwrites the other
**Why it happens:** No unique constraint, or retry logic on collision
**How to avoid:** Database unique index + application retry on constraint violation
**Warning signs:** Random "already used" errors on fresh codes

### Pitfall 6: Missing Disclaimer Record

**What goes wrong:** User disputes they agreed to terms, no proof of consent
**Why it happens:** Only storing boolean, not timestamp/version
**How to avoid:** Store consent timestamp, IP (if web), and terms version in database
**Warning signs:** Legal team asks for consent proof, can't provide

---

## Code Examples

### Email/Password Sign Up with Disclaimer

```typescript
// screens/auth/SignUpScreen.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import Checkbox from '@react-native-community/checkbox';
import { supabase } from '@/lib/supabase';

export function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signUp() {
    if (!disclaimerAccepted) {
      Alert.alert('동의 필요', '서비스 이용약관에 동의해주세요.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          disclaimer_accepted_at: new Date().toISOString(),
          disclaimer_version: '1.0',
        },
      },
    });

    if (error) {
      Alert.alert('오류', error.message);
    } else if (!data.session) {
      Alert.alert('확인', '이메일 인증 링크를 확인해주세요.');
    }

    setLoading(false);
  }

  return (
    <View className="flex-1 p-6 justify-center">
      <TextInput
        className="border border-gray-300 rounded-lg p-4 mb-4"
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        className="border border-gray-300 rounded-lg p-4 mb-4"
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View className="flex-row items-center mb-6">
        <Checkbox
          value={disclaimerAccepted}
          onValueChange={setDisclaimerAccepted}
        />
        <Text className="ml-2 flex-1">
          본 서비스는 전문 상담을 대체하지 않습니다.
          <Text className="text-blue-600" onPress={() => {/* Show full terms */}}>
            이용약관
          </Text>
          에 동의합니다.
        </Text>
      </View>

      <TouchableOpacity
        className={`p-4 rounded-lg ${disclaimerAccepted ? 'bg-primary' : 'bg-gray-300'}`}
        onPress={signUp}
        disabled={loading || !disclaimerAccepted}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? '처리 중...' : '가입하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Dual Consent Recording Prompt

```typescript
// components/consent/DualConsentPrompt.tsx
import { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onConsent: () => void;
  onDecline: () => void;
  coupleId: string;
}

export function DualConsentPrompt({ visible, onConsent, onDecline, coupleId }: Props) {
  const [myConsent, setMyConsent] = useState(false);
  const [partnerConsent, setPartnerConsent] = useState(false);

  // Subscribe to partner's consent in real-time
  useEffect(() => {
    const channel = supabase
      .channel(`consent:${coupleId}`)
      .on('broadcast', { event: 'consent' }, (payload) => {
        if (payload.payload.userId !== supabase.auth.user?.id) {
          setPartnerConsent(payload.payload.consented);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  // Broadcast my consent
  async function handleMyConsent(consented: boolean) {
    setMyConsent(consented);

    await supabase.channel(`consent:${coupleId}`).send({
      type: 'broadcast',
      event: 'consent',
      payload: {
        userId: supabase.auth.user?.id,
        consented,
        timestamp: new Date().toISOString(),
      },
    });

    if (consented && partnerConsent) {
      // Both consented - log consent record
      await supabase.from('recording_consents').insert({
        couple_id: coupleId,
        consented_at: new Date().toISOString(),
      });
      onConsent();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-xl font-bold mb-4">녹음 동의</Text>

          <Text className="text-gray-600 mb-6">
            녹음을 시작하려면 두 분 모두의 동의가 필요합니다.
            녹음된 대화는 분석을 위해서만 사용됩니다.
          </Text>

          <View className="flex-row justify-between mb-6">
            <View className="items-center">
              <View className={`w-12 h-12 rounded-full ${myConsent ? 'bg-green-500' : 'bg-gray-300'} items-center justify-center`}>
                <Text className="text-white">나</Text>
              </View>
              <Text className="mt-2">{myConsent ? '동의함' : '대기 중'}</Text>
            </View>

            <View className="items-center">
              <View className={`w-12 h-12 rounded-full ${partnerConsent ? 'bg-green-500' : 'bg-gray-300'} items-center justify-center`}>
                <Text className="text-white">파트너</Text>
              </View>
              <Text className="mt-2">{partnerConsent ? '동의함' : '대기 중'}</Text>
            </View>
          </View>

          <View className="flex-row gap-4">
            <TouchableOpacity
              className="flex-1 p-4 bg-gray-200 rounded-lg"
              onPress={onDecline}
            >
              <Text className="text-center">거절</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-4 rounded-lg ${myConsent ? 'bg-gray-400' : 'bg-primary'}`}
              onPress={() => handleMyConsent(true)}
              disabled={myConsent}
            >
              <Text className="text-white text-center">
                {myConsent ? '동의 완료' : '동의하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

### Coach Mark Tutorial Setup

```typescript
// screens/onboarding/TutorialScreen.tsx
import { CopilotProvider, CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect } from 'react';

const CopilotText = walkthroughable(Text);
const CopilotView = walkthroughable(View);

function TutorialContent() {
  const { start, currentStep, isLastStep } = useCopilot();

  // Auto-start tutorial
  useEffect(() => {
    start();
  }, []);

  return (
    <View className="flex-1 p-6">
      <CopilotStep
        text="여기서 오늘의 감정과 상황을 기록할 수 있어요."
        order={1}
        name="record"
      >
        <CopilotView className="bg-primary p-4 rounded-lg mb-4">
          <Text className="text-white">기록하기</Text>
        </CopilotView>
      </CopilotStep>

      <CopilotStep
        text="파트너와 함께 녹음을 시작하려면 여기를 눌러주세요."
        order={2}
        name="recording"
      >
        <CopilotView className="bg-secondary p-4 rounded-lg mb-4">
          <Text className="text-white">갈등 녹음</Text>
        </CopilotView>
      </CopilotStep>

      <CopilotStep
        text="AI가 분석한 리프레이밍 결과를 확인할 수 있어요."
        order={3}
        name="insights"
      >
        <CopilotView className="bg-accent p-4 rounded-lg">
          <Text>인사이트</Text>
        </CopilotView>
      </CopilotStep>
    </View>
  );
}

export function TutorialScreen() {
  return (
    <CopilotProvider
      overlay="svg"
      labels={{
        previous: '이전',
        next: '다음',
        skip: '', // No skip - mandatory tutorial per CONTEXT.md
        finish: '시작하기',
      }}
      backdropColor="rgba(0, 0, 0, 0.7)"
      tooltipStyle={{
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <TutorialContent />
    </CopilotProvider>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage for all auth | expo-secure-store + hybrid | 2024 | Hardware-backed encryption mandatory for sensitive data |
| Firebase Auth | Supabase Auth | 2023-2024 | Better RLS, PostgreSQL relations, predictable pricing |
| Manual token refresh | Supabase autoRefreshToken | 2023 | Handles app lifecycle, background/foreground transitions |
| expo-av for audio | expo-audio | SDK 53 (2025) | expo-av deprecated, new API more stable |
| @react-native-community/checkbox built-in | Community package | 2022 | Built-in deprecated, use community version |

**Deprecated/outdated:**
- **AsyncStorage for auth tokens:** Unencrypted, security risk
- **expo-av for recording:** Deprecated in SDK 53, use expo-audio
- **copilot() HOC:** Deprecated in v3, use CopilotStep component
- **Firebase for therapy apps:** RLS harder to configure, NoSQL poor fit for relational data

---

## Legal & Compliance Notes (Korea)

### Korean Recording Law (통신비밀보호법)

**Legal status:** One-party consent is legal in Korea. A conversation participant can record without the other party's consent without criminal liability.

**However, for this app:**
- Per CONTEXT.md decision: "녹음 동의: 매번 녹음 시 요청, 양측 동의 시에만 진행"
- **Ethical position:** Dual consent is mandatory for relationship safety
- Recording without partner consent could enable abuse scenarios

**Key considerations:**
- Store consent records with timestamps
- Both partners must explicitly consent before each recording session
- Consent can be withdrawn at any time
- If consent denied, recording cannot proceed (text input only)

### PIPA Compliance (개인정보보호법)

**2025 Updates:**
- Data portability rights effective March 13, 2025
- Foreign companies need domestic representative by October 2, 2025

**App requirements:**
- Clear privacy notice in Korean
- Explicit consent for data collection
- Data encryption at rest (AES-256 via Supabase)
- User data deletion capability
- Consent records with version tracking

---

## Open Questions

Things that couldn't be fully resolved:

1. **Email verification flow**
   - What we know: Supabase requires email verification by default; can disable for testing
   - What's unclear: Best UX for verification in mobile app (deep link back to app?)
   - Recommendation: Enable verification in production, implement deep link handler for verification links

2. **Offline session behavior**
   - What we know: `startAutoRefresh()` can clear session when offline
   - What's unclear: Exact conditions that trigger session loss
   - Recommendation: Add network state check before calling `startAutoRefresh()`, test thoroughly

3. **Partner invite link for non-installed apps**
   - What we know: Deep links only work if app installed
   - What's unclear: Whether to implement universal links or just show fallback page
   - Recommendation: Implement fallback web page with app store links; consider universal links for v2

---

## Sources

### Primary (HIGH confidence)
- [Supabase Auth React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Linking Documentation](https://docs.expo.dev/linking/into-your-app/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [react-native-copilot GitHub](https://github.com/mohebifar/react-native-copilot)

### Secondary (MEDIUM confidence)
- [Expo + Supabase User Management Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Korea PIPA 2025 Updates](https://crossborderadvisorysolutions.com/personal-information-protection-act-pipa-updates-2025/)
- [Korean 통신비밀보호법 Summary](https://www.haeonlaw.com/guide/view/39-%ED%97%88%EB%9D%BD%EB%B0%9B%EC%A7%80_%EC%95%8A%EC%9D%80_%EC%A0%84%ED%99%94_%EB%85%B9%EC%9D%8C_%EB%B6%88%EB%B2%95_%EC%95%84%EB%8B%8C%EA%B0%80%EC%9A%94)
- [Supabase RLS Best Practices 2025](https://vibeappscanner.com/supabase-row-level-security)

### Tertiary (LOW confidence)
- WebSearch results for dual consent UI patterns (no authoritative source found)
- WebSearch results for invite code generation patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are official Expo/Supabase recommendations
- Architecture: HIGH - Patterns verified against official documentation
- Security: HIGH - Based on official docs and known CVEs
- Korean legal: MEDIUM - Based on web sources, recommend legal review
- UI patterns (coach marks, consent): MEDIUM - Library docs verified, custom UI patterns extrapolated

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain)
