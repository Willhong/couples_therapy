# Vercel React Native Skills Rollout

기준 스킬: `vercel-react-native-skills`

## Priority 1: `ui-pressable`

목표: `TouchableOpacity` 제거 후 `Pressable` 표준화.

우선 파일:
- `mobile/src/components/ui/Button.tsx`
- `mobile/src/components/ui/Header.tsx`
- `mobile/src/components/ui/ListItem.tsx`
- `mobile/src/features/chat/components/ChatInput.tsx`
- `mobile/src/features/chat/components/SuggestionChips.tsx`
- `mobile/src/features/chat/components/InlineReframingCard.tsx`

규칙:
- `TouchableOpacity` 대신 `Pressable` 사용
- `activeOpacity` 의도는 `style={({ pressed }) => ...}`로 이관
- 공통 UI 컴포넌트부터 변경해서 하위 화면에 자동 전파

## Priority 2: List Performance

목표: `FlatList` 렌더 비용 감소.

우선 파일:
- `mobile/src/features/chat/components/MessageList.tsx`
- `mobile/src/features/transcript/components/TranscriptView.tsx`
- `mobile/src/features/conversations/components/ConversationList.tsx`
- `mobile/src/features/prompts/components/PromptHistory.tsx`
- `mobile/src/app/(main)/shared.tsx`
- `mobile/src/app/(main)/reports.tsx`

규칙:
- `renderItem` 안 인라인 콜백/객체 제거
- 아이템 컴포넌트에 객체 통째 전달 대신 primitive prop 전달
- 아이템 컴포넌트 `memo` 적용 가능 구조 유지
- 리스트 루트에서 콜백을 안정화해 ID만 전달

## Priority 3: `ui-safe-area-scroll`

목표: Scroll 레이아웃 안전영역 처리 일관화.

우선 파일:
- `mobile/src/app/(main)/home.tsx`
- `mobile/src/app/(main)/journal.tsx`
- `mobile/src/app/(main)/settings.tsx`
- `mobile/src/app/(main)/privacy-settings.tsx`
- `mobile/src/app/(main)/notification-settings.tsx`

규칙:
- 루트 `ScrollView`에 `contentInsetAdjustmentBehavior="automatic"` 우선 적용
- 수동 safe-area padding과 중복되지 않도록 정리

## Execution Batch

1. Batch A (공통 컴포넌트): `ui/Button`, `ui/Header`, `ui/ListItem`
2. Batch B (채팅/온보딩): `chat/*`, `onboarding/*`
3. Batch C (리스트 성능): `MessageList`, `TranscriptView`, `ConversationList`
4. Batch D (설정/정책 화면): `settings`, `privacy`, `notification`

## Done Criteria

- 신규 코드에서 `TouchableOpacity` 사용 0건
- 주요 `FlatList`에서 인라인 콜백/불필요 객체 전달 제거
- 설정/정책 주요 스크린의 루트 `ScrollView` safe-area 방식 통일
