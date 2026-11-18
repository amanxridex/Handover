import avatarDefault from '../assets/avatar-default.jpg';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  fetchRedisEndpoint,
  getCachedValue,
  withSwrCache,
} from './clientCache';

export const FOUNDER_CATEGORIES = [
  'All',
  'Consumer',
  'SaaS & AI',
  'Fintech',
  'E-commerce',
  'Health',
];

export function normalizeFounderSector(rawSector) {
  const s = String(rawSector || '').toLowerCase();
  if (!s) return 'Consumer';
  if (s.includes('saas') || s.includes('ai')) return 'SaaS & AI';
  if (s.includes('fintech') || s.includes('pay')) return 'Fintech';
  if (s.includes('commerce') || s.includes('retail')) return 'E-commerce';
  if (s.includes('health') || s.includes('well')) return 'Health';
  if (s.includes('consumer') || s.includes('life') || s.includes('media')) {
    return 'Consumer';
  }
  return 'Consumer';
}

export function getFallbackFounders() {
  return [];
}

function mapDbFounderRow(row) {
  return {
    id: row.id,
    fullName: row.full_name || 'Founder',
    name: row.full_name || 'Founder',
    username: row.username || 'founder',
    companyName: row.company_name || row.full_name || 'Startup',
    sector: normalizeFounderSector(row.sector),
    rawSector: row.sector || 'Founder',
    location: row.sector ? `${row.sector} · Verified Founder` : 'Verified Founder',
    companyPitch: row.company_pitch || 'Building on Handover.',
    avatar: row.company_logo_url || row.avatar_url || avatarDefault,
    userAvatar: row.avatar_url || avatarDefault,
    websiteUrl: row.website_url || '',
    instagram: row.instagram_handle || '',
    fromDb: true,
  };
}

export function getCachedFoundersDirectory() {
  return getCachedValue('founders:directory');
}

export async function fetchFoundersDirectory({ force = false } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  return withSwrCache(
    'founders:directory',
    async () => {
      const redisRows = await fetchRedisEndpoint('/api/founders', { force });
      if (Array.isArray(redisRows)) {
        return redisRows.map(mapDbFounderRow);
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, full_name, username, avatar_url, role, company_name, company_logo_url, company_pitch, sector, website_url, instagram_handle, created_at'
          )
          .eq('role', 'founder')
          .eq('onboarding_completed', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error || !Array.isArray(data)) {
          return [];
        }

        return data.map(mapDbFounderRow);
      } catch {
        return [];
      }
    },
    { ttlMs: 90000, force }
  );
}
