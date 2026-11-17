import avatarJacob from '../assets/avatar-jacob.jpg';
import chatAlice from '../assets/chat-alice.jpg';
import chatCharlie from '../assets/chat-charlie.jpg';
import chatDavid from '../assets/chat-david.jpg';
import creation5 from '../assets/creation-5.jpg';
import profileHero from '../assets/profile-hero.jpg';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const FOUNDER_CATEGORIES = [
  'All',
  'Consumer',
  'SaaS & AI',
  'Fintech',
  'E-commerce',
  'Health',
];

const CURATED_FOUNDERS = [
  {
    id: 'founder-ember',
    fullName: 'Elena Vance',
    username: 'elenavance',
    companyName: 'Ember & Oak',
    sector: 'Consumer',
    location: '55 Grove Street, Brooklyn, NY',
    companyPitch: 'Curated hospitality & creator dining spaces across NYC.',
    rating: '4.9',
    avatar: creation5,
    websiteUrl: 'emberandoak.com',
  },
  {
    id: 'founder-luna',
    fullName: 'Marcus Reid',
    username: 'marcusreid',
    companyName: 'Luna Pay',
    sector: 'Fintech',
    location: '410 Sunset Blvd, Los Angeles, CA',
    companyPitch: 'Instant creator payouts and brand escrow treasury.',
    rating: '4.8',
    avatar: chatDavid,
    websiteUrl: 'lunapay.io',
  },
  {
    id: 'founder-saffron',
    fullName: 'Ananya Rao',
    username: 'ananyarao',
    companyName: 'Saffron AI',
    sector: 'SaaS & AI',
    location: '89 Curry Lane, San Francisco, CA',
    companyPitch: 'Autonomous media workflow copilot for lean brand teams.',
    rating: '4.7',
    avatar: chatAlice,
    websiteUrl: 'saffronai.co',
  },
  {
    id: 'founder-marble',
    fullName: 'Daniel Park',
    username: 'danielpark',
    companyName: 'The Marble Co',
    sector: 'E-commerce',
    location: '14 West 22nd St, New York, NY',
    companyPitch: 'Direct-to-creator tactile homeware and studio objects.',
    rating: '4.6',
    avatar: chatCharlie,
    websiteUrl: 'themarble.co',
  },
  {
    id: 'founder-komorebi',
    fullName: 'Olivia Beits',
    username: 'oliviabeits',
    companyName: 'Komorebi Health',
    sector: 'Health',
    location: '22 Willow St, Seattle, WA',
    companyPitch: 'Mindful recovery rituals built with athletes and creators.',
    rating: '4.8',
    avatar: profileHero,
    websiteUrl: 'komorebihealth.com',
  },
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
  return CURATED_FOUNDERS;
}

export async function fetchFoundersDirectory() {
  if (!isSupabaseConfigured || !supabase) {
    return CURATED_FOUNDERS;
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
      .limit(30);

    if (error || !Array.isArray(data)) {
      return CURATED_FOUNDERS;
    }

    const dbFounders = data.map((row) => ({
      id: row.id,
      fullName: row.full_name || 'Founder',
      username: row.username || 'founder',
      companyName: row.company_name || row.full_name || 'Startup',
      sector: normalizeFounderSector(row.sector),
      rawSector: row.sector || 'Founder',
      location:
        row.company_pitch ||
        (row.sector ? `${row.sector} · Verified Founder` : 'Verified Founder'),
      companyPitch: row.company_pitch || 'Building on Handover.',
      rating: '4.9',
      avatar: row.company_logo_url || row.avatar_url || avatarJacob,
      websiteUrl: row.website_url || '',
      instagram: row.instagram_handle || '',
      fromDb: true,
    }));

    const seenNames = new Set(
      dbFounders.map((f) => f.companyName.trim().toLowerCase())
    );
    const merged = [
      ...dbFounders,
      ...CURATED_FOUNDERS.filter(
        (c) => !seenNames.has(c.companyName.trim().toLowerCase())
      ),
    ];
    return merged;
  } catch {
    return CURATED_FOUNDERS;
  }
}
