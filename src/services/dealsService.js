import { BRAND_DEAL_SECTIONS } from '../data/brandsData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getStoredSessionToken } from './profileService';

const APPS_CACHE_KEY = 'handover_deal_applications_v1';
const CATEGORY_ORDER = ['Restaurants', 'Sports', 'Clothing', 'Tech'];

export function getFallbackDeals() {
  const rows = [];
  let sortOrder = 1;
  for (const sec of BRAND_DEAL_SECTIONS) {
    for (const deal of sec.deals) {
      rows.push({
        id: deal.id,
        brandName: deal.brandName,
        category: sec.category,
        logoKey: deal.logoKey,
        paymentAmount: deal.paymentAmount,
        paymentCents: Number(String(deal.paymentAmount).replace(/[^0-9]/g, '')) * 100,
        currency: 'USD',
        headline: `${deal.brandName} Creator Offer`,
        subtitle: `${sec.category} Campaign · Verified Creator Collab`,
        deliverables: [
          '1x 45-60s Reel or Short product feature',
          '2x Story frames with official campaign tag',
          'Direct payout upon content approval',
        ],
        payoutTerms: `Single payment of ${deal.paymentAmount} upon campaign completion`,
        sortOrder: sortOrder++,
      });
    }
  }
  return rows;
}

function flattenFallbackDeals() {
  return getFallbackDeals();
}

function mapDbDealRow(row) {
  const deliverables = Array.isArray(row.deliverables)
    ? row.deliverables.map(String)
    : [];
  const minRequirements = Array.isArray(row.min_requirements)
    ? row.min_requirements.map(String).filter(Boolean)
    : [];
  return {
    id: row.id,
    brandName: row.brand_name,
    category: row.category,
    logoKey: row.logo_key,
    brandLogoUrl: row.brand_logo_url || '',
    paymentAmount: row.payment_amount,
    paymentCents: row.payment_cents || 0,
    currency: row.currency || 'USD',
    headline: row.headline || `${row.brand_name} Creator Offer`,
    subtitle: row.subtitle || `${row.category} Campaign · Verified Creator Collab`,
    deliverables: deliverables.length
      ? deliverables
      : [
          '1x 45-60s Reel or Short product feature',
          '2x Story frames with official campaign tag',
          'Direct payout upon content approval',
        ],
    minRequirements,
    brief: row.brief || '',
    payoutTerms:
      row.payout_terms ||
      `Single payment of ${row.payment_amount} upon campaign completion`,
    sortOrder: row.sort_order ?? 0,
  };
}

export function groupDealsByCategory(deals) {
  const grouped = new Map();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(cat, []);
  }
  for (const deal of deals) {
    const key = deal.category || 'Other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(deal);
  }
  return Array.from(grouped.entries())
    .filter(([, list]) => list.length > 0)
    .map(([category, dealsList]) => ({
      id: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category,
      deals: dealsList,
    }));
}

export function getStoredDealApplications() {
  try {
    const raw = window.localStorage.getItem(APPS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistStoredDealApplications(list) {
  try {
    window.localStorage.setItem(APPS_CACHE_KEY, JSON.stringify(list || []));
  } catch {
    // Ignore storage quota errors
  }
}

export async function fetchBrandDeals() {
  const fallback = flattenFallbackDeals();
  if (!isSupabaseConfigured || !supabase) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from('brand_deals')
      .select(
        'id, brand_name, category, logo_key, brand_logo_url, payment_amount, payment_cents, currency, headline, subtitle, deliverables, min_requirements, brief, payout_terms, sort_order'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) {
      return fallback;
    }

    return data.map(mapDbDealRow);
  } catch {
    return fallback;
  }
}

export async function fetchBrandDealById(dealId) {
  if (!dealId) return null;
  const fallback = flattenFallbackDeals().find((d) => d.id === dealId) || null;
  if (!isSupabaseConfigured || !supabase) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from('brand_deals')
      .select(
        'id, brand_name, category, logo_key, brand_logo_url, payment_amount, payment_cents, currency, headline, subtitle, deliverables, min_requirements, brief, payout_terms, sort_order'
      )
      .eq('id', dealId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    return mapDbDealRow(data);
  } catch {
    return fallback;
  }
}

export async function fetchMyDealApplications() {
  const local = getStoredDealApplications();
  const sessionToken = getStoredSessionToken();
  if (!isSupabaseConfigured || !supabase || !sessionToken) {
    return local;
  }

  try {
    const { data, error } = await supabase.rpc(
      'get_my_brand_deal_applications',
      {
        p_session_token: sessionToken,
      }
    );

    if (error || !Array.isArray(data)) {
      return local;
    }

    persistStoredDealApplications(data);
    return data;
  } catch {
    return local;
  }
}

export async function applyForBrandDeal(deal) {
  if (!deal?.id) {
    return { ok: false, error: 'INVALID_DEAL' };
  }

  const sessionToken = getStoredSessionToken();
  const optimisticApp = {
    id: `local-${deal.id}`,
    dealId: deal.id,
    status: 'applied',
    paymentAmount: deal.paymentAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase || !sessionToken) {
    const current = getStoredDealApplications().filter(
      (a) => a.dealId !== deal.id
    );
    const next = [optimisticApp, ...current];
    persistStoredDealApplications(next);
    return { ok: true, application: optimisticApp, applications: next };
  }

  try {
    const { data, error } = await supabase.rpc('apply_for_brand_deal', {
      p_session_token: sessionToken,
      p_deal_id: deal.id,
    });

    if (error || !data?.ok) {
      return {
        ok: false,
        error: data?.error || error?.message || 'REQUEST_FAILED',
      };
    }

    const savedApp = data.application;
    const current = getStoredDealApplications().filter(
      (a) => a.dealId !== deal.id
    );
    const next = [savedApp, ...current];
    persistStoredDealApplications(next);
    return { ok: true, application: savedApp, applications: next };
  } catch (err) {
    return { ok: false, error: err?.message || 'NETWORK_ERROR' };
  }
}

export async function withdrawBrandDealApplication(dealId) {
  if (!dealId) return { ok: false };

  const current = getStoredDealApplications().filter((a) => a.dealId !== dealId);
  persistStoredDealApplications(current);

  const sessionToken = getStoredSessionToken();
  if (!isSupabaseConfigured || !supabase || !sessionToken) {
    return { ok: true, applications: current };
  }

  try {
    const { error } = await supabase.rpc('withdraw_brand_deal_application', {
      p_session_token: sessionToken,
      p_deal_id: dealId,
    });
    if (error) {
      return { ok: false, applications: current };
    }
    return { ok: true, applications: current };
  } catch {
    return { ok: false, applications: current };
  }
}

export async function createBrandDeal({
  brandName,
  category,
  headline,
  subtitle,
  objectives,
  minRequirements,
  brief,
  paymentAmount,
  currency = 'USD',
  brandLogoUrl,
}) {
  const cleanBrand = String(brandName || '').trim();
  const numericAmount = Number(String(paymentAmount || '').replace(/[^0-9.]/g, ''));
  if (!cleanBrand || !numericAmount || numericAmount <= 0) {
    return { ok: false, error: 'Enter a brand name and valid payment amount.' };
  }

  const cleanCurrency = currency === 'INR' ? 'INR' : 'USD';
  const symbol = cleanCurrency === 'INR' ? '₹' : '$';
  const locale = cleanCurrency === 'INR' ? 'en-IN' : 'en-US';
  const formattedAmount = `${symbol}${Math.round(numericAmount).toLocaleString(locale)}`;
  const paymentCents = Math.round(numericAmount * 100);
  const cleanObjectives = (objectives || []).map((s) => String(s || '').trim()).filter(Boolean);
  const cleanReqs = (minRequirements || []).map((s) => String(s || '').trim()).filter(Boolean);
  const cleanBrief = String(brief || '').trim();
  const cleanCat = String(category || 'Tech').trim();

  const sessionToken = getStoredSessionToken();
  if (!isSupabaseConfigured || !supabase || !sessionToken) {
    return { ok: false, error: 'Sign in required to publish a brand deal.' };
  }

  try {
    const { data, error } = await supabase.rpc('create_brand_deal', {
      p_session_token: sessionToken,
      p_brand_name: cleanBrand,
      p_category: cleanCat,
      p_payment_amount: formattedAmount,
      p_payment_cents: paymentCents,
      p_headline: headline?.trim() || `${cleanBrand} Creator Offer`,
      p_subtitle: subtitle?.trim() || `${cleanCat} Campaign · Creator Collab`,
      p_deliverables: cleanObjectives,
      p_min_requirements: cleanReqs,
      p_brief: cleanBrief,
      p_brand_logo_url: brandLogoUrl || null,
      p_currency: cleanCurrency,
    });

    if (error || !data?.ok) {
      return {
        ok: false,
        error: data?.error || error?.message || 'Could not publish brand deal.',
      };
    }

    return { ok: true, deal: data.deal };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
}
