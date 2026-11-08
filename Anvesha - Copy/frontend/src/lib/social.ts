import type { Experience, Provider, SocialLinks } from './types';

/**
 * Validates that a URL is a valid, secure http or https URL.
 * Rejects empty strings, malformed links, javascript:, data:, etc.
 */
export function isValidSocialUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely extracts the Instagram username / handle from a profile URL.
 * e.g. "https://instagram.com/punefoodwalk_demo" -> "@punefoodwalk_demo"
 */
export function extractInstagramHandle(url?: string | null): string | undefined {
  if (!isValidSocialUrl(url)) return undefined;
  try {
    const parsed = new URL(url!.trim());
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 1) {
      const handle = segments[0].replace(/^@/, '');
      if (handle && !['p', 'reel', 'stories', 'explore'].includes(handle.toLowerCase())) {
        return `@${handle}`;
      }
    }
  } catch {
    // fallback if parsing handle fails
  }
  return undefined;
}

/**
 * Extracts a valid Instagram URL from an Experience or its Provider.
 * Experience-level social links take precedence over provider-level defaults.
 * If neither is explicitly provided, generates a safe dummy demo URL.
 */
export function getInstagramUrl(exp?: Experience | null): string {
  if (!exp) return 'https://instagram.com/travelsaathi_demo';
  const expUrl = exp.social?.instagram;
  if (isValidSocialUrl(expUrl)) return expUrl!.trim();

  const providerUrl = exp.provider?.social?.instagram;
  if (isValidSocialUrl(providerUrl)) return providerUrl!.trim();

  const safeId = (exp.id || 'travelsaathi').toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `https://instagram.com/${safeId}_demo`;
}

/**
 * Extracts a valid Instagram URL directly from a Provider.
 */
export function getProviderInstagramUrl(provider?: Provider | null): string | undefined {
  if (!provider) return undefined;
  const url = provider.social?.instagram;
  return isValidSocialUrl(url) ? url!.trim() : undefined;
}
