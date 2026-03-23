import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabase } from '@/lib/supabase';
import { fetchPurdueSpotlightDeal, getAppBaseUrl } from '@/lib/push/fetchPurdueSpotlight';
import { buildDiscoveryPushPayload, discoveryContentHash } from '@/lib/push/discoveryCopy';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const q = request.nextUrl.searchParams.get('secret');
  if (q === secret) return true;
  return false;
}

function configureWebPush(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:nayaeditorialshop@gmail.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!configureWebPush()) {
    return NextResponse.json({ error: 'VAPID keys not configured.' }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const base = getAppBaseUrl();

  const deal = await fetchPurdueSpotlightDeal(runDate);

  if (!deal) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      message: 'No deal candidates; try again later (not logged as sent).',
    });
  }

  const { data: rows, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('alert_type', 'purdue_deals');

  if (subErr) {
    return NextResponse.json({ ok: false, error: 'Could not load subscriptions.' }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      subscribers: 0,
      message: 'No subscribers yet — campaign not logged so tomorrow can retry.',
    });
  }

  const { error: logError } = await supabase.from('push_campaign_log').insert({
    campaign: 'purdue_deals_daily',
    run_date: runDate,
  });

  if (logError) {
    if ((logError as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already_ran_today' });
    }
    console.error('[cron/purdue-deals] campaign log insert:', logError);
    return NextResponse.json({ error: 'Campaign log failed.' }, { status: 500 });
  }

  const clickSource =
    discoveryContentHash(runDate, deal.title) % 2 === 0 ? 'push_discovery' : 'push_purdue_style';

  const openUrl = `${base}/go?${new URLSearchParams({
    url: deal.listingUrl,
    title: deal.title,
    price: String(deal.price),
    source: clickSource,
    image: deal.image || '',
  }).toString()}`;

  const { title, body } = buildDiscoveryPushPayload({
    dealTitle: deal.title,
    price: deal.price,
    sourceLabel: deal.sourceLabel,
    runDate,
  });

  const payload = JSON.stringify({
    title,
    body,
    icon: `${base}/icon-192.png`,
    badge: `${base}/icon-192.png`,
    tag: `naya-discovery-${runDate}`,
    data: { url: openUrl },
  });

  let sent = 0;
  const deadEndpoints: string[] = [];

  for (const row of rows) {
    const subscription = {
      endpoint: row.endpoint as string,
      keys: { p256dh: row.p256dh as string, auth: row.auth as string },
    };
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 * 12 });
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        deadEndpoints.push(row.endpoint as string);
      } else {
        console.error('[cron/purdue-deals] send failed:', err);
      }
    }
  }

  if (deadEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints);
  }

  return NextResponse.json({
    ok: true,
    sent,
    subscribers: rows.length,
    deadRemoved: deadEndpoints.length,
  });
}
