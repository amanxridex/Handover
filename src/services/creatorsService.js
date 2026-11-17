import chatAlice from '../assets/chat-alice.jpg';
import chatBella from '../assets/chat-bella.jpg';
import chatCharlie from '../assets/chat-charlie.jpg';
import chatDavid from '../assets/chat-david.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation4 from '../assets/creation-4.jpg';
import creation5 from '../assets/creation-5.jpg';
import creation6 from '../assets/creation-6.jpg';
import feedPillowFight from '../assets/feed-pillow-fight.jpg';
import feedWarmPost from '../assets/feed-warm-post.jpg';
import profileHero from '../assets/profile-hero.jpg';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const FEATURED_CREATORS = [
  {
    id: 'creator-maria',
    fullName: 'Maria Theodor',
    username: 'mariatheodor',
    featuredTag: 'FEATURED',
    nicheSummary: '@mariatheodor · Lifestyle & Travel',
    campaignsText: '12 brand collabs active',
    statsLine: '184K reach · Reels & Stories',
    metricShort: '184K',
    accentColor: '#e11d48',
    avatar: creation5,
    coverImage: feedPillowFight,
    miniAvatars: [chatAlice, chatBella, chatDavid],
    contentTypes: ['Lifestyle', 'Food & Travel'],
  },
  {
    id: 'creator-olivia',
    fullName: 'Olivia Beits',
    username: 'oliviabeits',
    featuredTag: 'TOP CREATOR',
    nicheSummary: '@oliviabeits · Fashion & Editorial',
    campaignsText: '9 brand collabs active',
    statsLine: '215K reach · Lookbooks & Video',
    metricShort: '215K',
    accentColor: '#0284c7',
    avatar: profileHero,
    coverImage: feedWarmPost,
    miniAvatars: [creation3, chatCharlie, chatAlice],
    contentTypes: ['Fashion', 'Lifestyle'],
  },
  {
    id: 'creator-charlie',
    fullName: 'Charlie Brown',
    username: 'charliebrown',
    featuredTag: 'RISING',
    nicheSummary: '@charliebrown · Tech & Visual Storytelling',
    campaignsText: '7 brand collabs active',
    statsLine: '96K reach · Desk Setup & Gear',
    metricShort: '96K',
    accentColor: '#f97316',
    avatar: chatCharlie,
    coverImage: creation6,
    miniAvatars: [chatDavid, creation4, chatBella],
    contentTypes: ['Tech & AI', 'Gaming'],
  },
];

const DIRECTORY_CREATORS = [
  {
    id: 'creator-alice',
    fullName: 'Alice Johnson',
    username: 'alicejohnson',
    nicheSummary: '@alicejohnson · Lifestyle & Design',
    statsLine: '142K followers · Lifestyle',
    metricShort: '142K',
    accentColor: '#e11d48',
    avatar: chatAlice,
    coverImage: creation4,
    contentTypes: ['Lifestyle', 'Fashion'],
  },
  {
    id: 'creator-david',
    fullName: 'David Smith',
    username: 'davidsmith',
    nicheSummary: '@davidsmith · Fitness & Gear',
    statsLine: '118K followers · Fitness',
    metricShort: '118K',
    accentColor: '#0284c7',
    avatar: chatDavid,
    coverImage: creation3,
    contentTypes: ['Fitness', 'Tech & AI'],
  },
  {
    id: 'creator-bella',
    fullName: 'Bella Martinez',
    username: 'bellamartinez',
    nicheSummary: '@bellamartinez · Food & Culture',
    statsLine: '88K followers · Food & Travel',
    metricShort: '88K',
    accentColor: '#f97316',
    avatar: chatBella,
    coverImage: feedWarmPost,
    contentTypes: ['Food & Travel', 'Comedy'],
  },
  {
    id: 'creator-elena',
    fullName: 'Elena Costa',
    username: 'elenacosta',
    nicheSummary: '@elenacosta · Tech & Desk',
    statsLine: '64K followers · Tech & AI',
    metricShort: '64K',
    accentColor: '#4f46e5',
    avatar: creation3,
    coverImage: creation6,
    contentTypes: ['Tech & AI', 'Gaming'],
  },
];

export function getFallbackCreatorsData() {
  return {
    featured: FEATURED_CREATORS,
    list: DIRECTORY_CREATORS,
  };
}

export async function fetchCreatorsDirectory() {
  if (!isSupabaseConfigured || !supabase) {
    return getFallbackCreatorsData();
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, username, avatar_url, role, content_types, instagram_handle, bio, created_at'
      )
      .eq('role', 'creator')
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !Array.isArray(data)) {
      return getFallbackCreatorsData();
    }

    const dbCreators = data.map((row) => {
      const types =
        Array.isArray(row.content_types) && row.content_types.length > 0
          ? row.content_types
          : ['Creator'];
      const primaryNiche = types[0];
      return {
        id: row.id,
        fullName: row.full_name || 'Creator',
        username: row.username || 'creator',
        nicheSummary: `@${row.username || 'creator'} · ${primaryNiche}`,
        statsLine: `${types.slice(0, 2).join(' · ')} · Verified`,
        metricShort: 'New',
        accentColor: '#0b45dc',
        avatar: row.avatar_url || chatAlice,
        coverImage: row.avatar_url || feedWarmPost,
        contentTypes: types,
        instagram: row.instagram_handle || '',
        bio: row.bio || '',
        fromDb: true,
      };
    });

    const seenUsernames = new Set(
      dbCreators.map((c) => c.username.trim().toLowerCase())
    );
    const mergedList = [
      ...dbCreators,
      ...DIRECTORY_CREATORS.filter(
        (c) => !seenUsernames.has(c.username.trim().toLowerCase())
      ),
    ];

    return {
      featured: FEATURED_CREATORS,
      list: mergedList,
    };
  } catch {
    return getFallbackCreatorsData();
  }
}
