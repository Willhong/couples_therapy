import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Create a deep link URL for partner invitation
 * @param code - 6-digit invite code
 * @returns Deep link URL (e.g., couplesai://invite?code=ABC123)
 */
export function createInviteLink(code: string): string {
  return Linking.createURL('invite', { queryParams: { code } });
}

/**
 * Parse a deep link URL to extract invite code
 * @param url - Deep link URL to parse
 * @returns Invite code if found, null otherwise
 */
export function parseInviteLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);

    // Check if this is an invite link
    // The path could be 'invite' or the hostname could be 'invite'
    const isInviteLink =
      parsed.path === 'invite' ||
      parsed.hostname === 'invite' ||
      (parsed.path && parsed.path.includes('invite'));

    if (!isInviteLink) {
      return null;
    }

    // Extract code from query params
    const code = parsed.queryParams?.code;

    if (typeof code === 'string' && code.length === 6) {
      return code.toUpperCase();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Hook to handle incoming deep links
 * Should be used in root _layout.tsx to handle deep links globally
 *
 * Handles both:
 * - Cold start: App was not running when deep link was opened
 * - Warm start: App was already running in background
 */
export function useInviteLink(): void {
  const url = useURL();
  const router = useRouter();

  useEffect(() => {
    if (!url) {
      return;
    }

    const code = parseInviteLink(url);

    if (code) {
      // Navigate to partner link screen with code pre-filled
      router.push(`/onboarding/partner-link?code=${code}`);
    }
  }, [url, router]);
}
