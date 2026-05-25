import { ActivatedRoute } from '@angular/router';

export interface ReferralInfo {
  referralSource: string | null;
  referralMedium: string | null;
  referralCampaign: string | null;
  referrerUrl: string | null;
  referrerNetwork: string | null;
}

const EMPTY: ReferralInfo = {
  referralSource: null,
  referralMedium: null,
  referralCampaign: null,
  referrerUrl: null,
  referrerNetwork: null,
};

export function parseReferralFromWindow(route: ActivatedRoute): ReferralInfo {
  const qp = route?.snapshot?.queryParamMap;
  const get = (key: string): string | null => (qp ? qp.get(key) : null);
  const referrerUrl =
    typeof document !== 'undefined' && document.referrer
      ? document.referrer
      : null;

  return {
    referralSource:
      get('utm_source') ?? get('ref_source') ?? get('source') ?? null,
    referralMedium:
      get('utm_medium') ?? get('ref_medium') ?? get('medium') ?? null,
    referralCampaign:
      get('utm_campaign') ?? get('ref_campaign') ?? get('campaign') ?? null,
    referrerUrl,
    referrerNetwork: classifyNetwork(referrerUrl),
  };
}

export function classifyNetwork(url: string | null): string {
  if (!url) return 'direct';
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'other';
  }
  if (host.includes('youtube.') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('instagram.')) return 'instagram';
  if (host.includes('tiktok.')) return 'tiktok';
  if (host.includes('facebook.') || host.includes('fb.')) return 'facebook';
  if (host === 'x.com' || host.endsWith('.x.com') || host.includes('twitter.'))
    return 'x';
  if (host.includes('reddit.')) return 'reddit';
  if (host.includes('t.me') || host.includes('telegram.')) return 'telegram';
  if (host.includes('linkedin.')) return 'linkedin';
  if (host.includes('whatsapp.') || host.endsWith('wa.me')) return 'whatsapp';
  return 'other';
}

export const EMPTY_REFERRAL: ReferralInfo = EMPTY;
