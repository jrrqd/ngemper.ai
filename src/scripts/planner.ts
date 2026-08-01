import { composePlan } from '../lib/composePlan';
import { hubsFromMilestones } from '../lib/hubs';
import { rankRoutes } from '../lib/rankRoutes';
import { saveVsFlying, totalDurationMin, totalPriceIdr } from '../lib/totals';
import { formatDuration, formatIdr } from '../lib/format';
import { mapsEmbedUrl } from '../lib/mapsEmbedUrl';
import { buildShareUrl, parseShareUrl } from '../lib/shareUrl';
import type { CityId, Milestone, Plan, RouteAlternative, SortMode } from '../types';

type BootOptions = { mapsKey: string };

let plan: Plan | null = null;
let sort: SortMode = 'cheapest';
let selectedRouteId: string | null = null;
let mapsKey = '';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function showToast(message: string) {
  const toast = $('toast');
  toast.hidden = false;
  toast.textContent = message;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 4000);
}

function ranked(): RouteAlternative[] {
  if (!plan) return [];
  return rankRoutes(plan.routes, sort);
}

function selectedRoute(): RouteAlternative | null {
  const list = ranked();
  return list.find((r) => r.id === selectedRouteId) ?? list[0] ?? null;
}

function renderFlight() {
  if (!plan) return;
  const f = plan.flightAlternative;
  $('flight-strip').innerHTML = `<strong>Vs flying</strong> · ${f.carrier} · ${formatDuration(f.durationMin)} · ${formatIdr(f.priceIdr)} <span class="badge">flight avg</span>`;
}

function renderHubStream(hubs: string[]): string {
  const nodes = hubs
    .map(
      (hub, i) => `
      <li class="hub-stream__node${i === 0 ? ' is-start' : ''}${i === hubs.length - 1 ? ' is-end' : ''}">
        <span class="hub-stream__dot" aria-hidden="true"></span>
        <span class="hub-stream__label">${hub}</span>
      </li>`,
    )
    .join('');
  return `<ol class="hub-stream" aria-label="Hubs: ${hubs.join(' → ')}">${nodes}</ol>`;
}

function renderRoutes() {
  const list = ranked();
  const root = $('route-list');
  root.innerHTML = '';
  list.forEach((route, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `route-card${route.id === selectedRoute()?.id ? ' is-selected' : ''}`;
    btn.dataset.routeId = route.id;
    const save = plan ? saveVsFlying(route, plan.flightAlternative) : 0;
    const best =
      sort === 'cheapest' && index === 0
        ? '<span class="best-value">Best value</span>'
        : '';
    const hubs = hubsFromMilestones(route.milestones);
    btn.innerHTML = `
      <div class="route-card__header">
        <div class="route-card__title">
          <span class="route-card__rank">${index + 1}.</span>
          <span class="route-card__label">${route.label}</span>
          ${best}
        </div>
        <div class="route-card__meta">${formatIdr(totalPriceIdr(route))} · ${formatDuration(totalDurationMin(route))}</div>
      </div>
      <div class="route-card__save">Save ${formatIdr(save)} vs flying</div>
      ${renderHubStream(hubs)}
    `;
    btn.addEventListener('click', () => {
      selectedRouteId = route.id;
      syncUrl();
      renderAll();
    });
    root.appendChild(btn);
  });
}

function renderMap(milestones: Milestone[]) {
  const mapRoot = $('route-map');
  const url = mapsEmbedUrl(milestones, mapsKey);
  if (!url) {
    mapRoot.innerHTML =
      '<div class="map-placeholder">Map unavailable — set PUBLIC_GOOGLE_MAPS_EMBED_KEY</div>';
    return;
  }
  mapRoot.innerHTML = `<iframe class="map-frame" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${url}" title="Route checkpoints map"></iframe>`;
}

function renderSnapshot(m: Milestone, index: number): string {
  const leg = `${m.from} → ${m.to}`;
  if (index < 3 && m.snapshot.type === 'embed') {
    const label = m.snapshot.provider === 'tiktok' ? 'TikTok' : 'YouTube';
    return `
      <figure class="snapshot">
        <div class="snapshot__frame">
          <iframe
            loading="lazy"
            src="${m.snapshot.url}"
            title="Travel snapshot: ${leg}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
        <figcaption class="snapshot__caption">Travel snapshot · ${label}</figcaption>
      </figure>`;
  }
  if (m.snapshot.type === 'static') {
    return `
      <figure class="snapshot">
        <div class="snapshot__frame">
          <img src="${m.snapshot.image}" alt="Travel still: ${leg}" loading="lazy" />
        </div>
        <figcaption class="snapshot__caption">
          <a href="${m.snapshot.url}" target="_blank" rel="noreferrer">${m.snapshot.creator}</a>
          · still
        </figcaption>
      </figure>`;
  }
  return `
    <p class="milestone__sub">
      <a href="${m.snapshot.url}" target="_blank" rel="noreferrer">Watch travel snapshot ↗</a>
    </p>`;
}

const MENU_ACTIONS = [
  { id: 'station', label: 'Transit station details' },
  { id: 'food', label: 'Recommended · food' },
  { id: 'shower', label: 'Recommended · shower' },
  { id: 'hotel', label: 'Recommended · hotel' },
  { id: 'tickets', label: 'Tickets' },
] as const;

type MenuActionId = (typeof MENU_ACTIONS)[number]['id'];

function closeAllMenus(except?: HTMLElement) {
  document.querySelectorAll('.milestone__menu').forEach((menu) => {
    if (except && menu === except) return;
    (menu as HTMLElement).hidden = true;
    const btn = menu.previousElementSibling as HTMLElement | null;
    if (btn?.matches('.milestone__menu-btn')) {
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function handleMenuAction(action: MenuActionId, m: Milestone) {
  const station = m.to;
  const messages: Record<MenuActionId, string> = {
    station: `${station} · hub notes (curated). Check arrival board, left-luggage, and waiting halls before you connect.`,
    food: `Food near ${station} · warung & station canteen picks (estimates). Aim for something quick before the next leg.`,
    shower: `Shower / wash near ${station} · transit hotels & public washrooms when listed. Confirm hours on arrival.`,
    hotel: `Hotels near ${station} · budget stays within walking distance of the hub (estimates only).`,
    tickets:
      m.ticket != null
        ? `Opening ${m.ticket.provider} for ${m.from} → ${m.to}…`
        : `No curated ticket link for this leg yet — check the operator desk at ${station}.`,
  };

  if (action === 'tickets' && m.ticket) {
    window.open(m.ticket.url, '_blank', 'noopener,noreferrer');
  }
  showToast(messages[action]);
}

function renderMilestones(route: RouteAlternative) {
  const root = $('milestone-list');
  root.innerHTML = '';
  root.className = 'milestone-timeline';
  const total = route.milestones.length;

  route.milestones.forEach((m, index) => {
    const card = document.createElement('article');
    const isStart = index === 0;
    const isEnd = index === total - 1;
    card.className = [
      'milestone',
      m.crossBorder ? 'is-border' : '',
      isStart ? 'is-start' : '',
      isEnd ? 'is-end' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const badges = [
      m.estimate ? '<span class="badge">estimate</span>' : '',
      m.crossBorder && m.borderPrep
        ? `<span class="badge">${m.borderPrep.badge}</span>`
        : '',
    ].join(' ');

    const checklist =
      m.crossBorder && m.borderPrep
        ? `<ul class="checklist">${m.borderPrep.checklist.map((c) => `<li>${c}</li>`).join('')}</ul>`
        : '';

    const ticketLink =
      m.legType === 'transit' && m.ticket
        ? `<p class="milestone__sub"><a class="milestone__ticket" href="${m.ticket.url}" target="_blank" rel="noopener noreferrer">Buy tickets ↗</a></p>`
        : '';

    const menuItems = MENU_ACTIONS.map(
      (a) =>
        `<button type="button" class="milestone__menu-item" data-action="${a.id}">${a.label}</button>`,
    ).join('');

    card.innerHTML = `
      <span class="milestone__rail" aria-hidden="true">
        <span class="milestone__dot"></span>
      </span>
      <div class="milestone__body">
        <div class="milestone__meta">
          <span>${index + 1}. ${m.mode}</span>
          <span>${formatDuration(m.durationMin)} · ${formatIdr(m.priceIdr)}${badges}</span>
        </div>
        <p class="milestone__sub">${m.from} → ${m.to}</p>
        ${ticketLink}
        ${checklist}
        ${renderSnapshot(m, index)}
        <div class="milestone__actions">
          <button type="button" class="milestone__menu-btn" aria-expanded="false" aria-haspopup="true">
            Explore nearby
          </button>
          <div class="milestone__menu" hidden role="menu">
            ${menuItems}
          </div>
        </div>
      </div>
    `;

    const menuBtn = card.querySelector('.milestone__menu-btn') as HTMLButtonElement;
    const menu = card.querySelector('.milestone__menu') as HTMLElement;

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeAllMenus(open ? menu : undefined);
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('.milestone__menu-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (item as HTMLElement).dataset.action as MenuActionId;
        handleMenuAction(action, m);
        closeAllMenus();
      });
    });

    root.appendChild(card);
  });
}

function renderDetail() {
  const route = selectedRoute();
  const detail = $('route-detail');
  if (!route) {
    detail.hidden = true;
    return;
  }
  detail.hidden = false;
  selectedRouteId = route.id;
  renderMap(route.milestones);
  renderMilestones(route);
}

function syncUrl() {
  if (!plan || !selectedRouteId) return;
  const path = buildShareUrl({
    origin: plan.origin,
    destination: plan.destination,
    route: selectedRouteId,
    sort,
  });
  history.replaceState(null, '', path);
}

function renderAll() {
  if (!plan) return;
  $('results').hidden = false;
  $('sort-toggle').hidden = false;
  renderFlight();
  renderRoutes();
  renderDetail();
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function runPlan(origin: CityId, destination: CityId, preferredRoute?: string) {
  try {
    plan = composePlan(origin, destination);
    const rankedList = rankRoutes(plan.routes, sort);
    selectedRouteId =
      preferredRoute && rankedList.some((r) => r.id === preferredRoute)
        ? preferredRoute
        : rankedList[0]?.id ?? null;
    aiDemoPlayed = false;
    aiDemoRunning = false;
    $('ai-messages').innerHTML = '';
    renderAll();
    syncUrl();
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Could not plan this route');
  }
}

async function copyShare() {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Share URL copied');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Share URL copied');
  }
}

type ChatRole = 'user' | 'assistant';

type MockTurn = {
  role: ChatRole;
  text: string;
  delayMs: number;
};

let aiDemoRunning = false;
let aiDemoPlayed = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function appendChatBubble(role: ChatRole, text: string) {
  const log = $('ai-messages');
  const bubble = document.createElement('div');
  bubble.className = `ai-chat__bubble ai-chat__bubble--${role}`;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function appendTypingIndicator(): HTMLElement {
  const log = $('ai-messages');
  const typing = document.createElement('div');
  typing.className = 'ai-chat__bubble ai-chat__bubble--assistant ai-chat__typing';
  typing.setAttribute('aria-label', 'Assistant is typing');
  typing.innerHTML =
    '<span class="ai-chat__dot"></span><span class="ai-chat__dot"></span><span class="ai-chat__dot"></span>';
  log.appendChild(typing);
  log.scrollTop = log.scrollHeight;
  return typing;
}

function mockScript(): MockTurn[] {
  const route = selectedRoute();
  const dest = plan?.destination ?? 'your destination';
  const label = route?.label ?? 'this route';
  const firstHub = route?.milestones[0]?.to ?? 'the first hub';
  return [
    {
      role: 'user',
      text: `Any tips for ${label}?`,
      delayMs: 400,
    },
    {
      role: 'assistant',
      text: `I'd pad buffers around ${firstHub} — overland schedules slip. Keep passport ready for any cross-border leg, and treat all prices as estimates.`,
      delayMs: 1400,
    },
    {
      role: 'user',
      text: 'Where should I sleep if we miss a connection?',
      delayMs: 900,
    },
    {
      role: 'assistant',
      text: `Look for transit hotels near the station you land in, then rebook the next morning. For ${dest}, book onward tickets early when possible — weekend buses fill up.`,
      delayMs: 1600,
    },
  ];
}

async function playAiDemo() {
  if (aiDemoRunning || aiDemoPlayed) return;
  aiDemoRunning = true;
  const log = $('ai-messages');
  log.innerHTML = '';

  for (const turn of mockScript()) {
    await sleep(turn.delayMs);
    if (turn.role === 'assistant') {
      const typing = appendTypingIndicator();
      await sleep(1100);
      typing.remove();
    }
    appendChatBubble(turn.role, turn.text);
  }

  aiDemoPlayed = true;
  aiDemoRunning = false;
}

function setAiOpen(open: boolean) {
  const panel = $('ai-chat-panel');
  const toggle = $('ai-chat-toggle') as HTMLButtonElement;
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    void playAiDemo();
  }
}

function bootAiChat() {
  const toggle = $('ai-chat-toggle') as HTMLButtonElement;
  const closeBtn = $('ai-chat-close') as HTMLButtonElement;
  const form = $('ai-chat-form') as HTMLFormElement;
  const input = $('ai-chat-input') as HTMLInputElement;

  toggle.addEventListener('click', () => {
    const panel = $('ai-chat-panel');
    setAiOpen(panel.hidden);
  });

  closeBtn.addEventListener('click', () => setAiOpen(false));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || aiDemoRunning) return;
    input.value = '';
    appendChatBubble('user', text);
    const typing = appendTypingIndicator();
    await sleep(1200);
    typing.remove();
    const route = selectedRoute();
    appendChatBubble(
      'assistant',
      route
        ? `Mock reply · for ${route.label}, check Explore nearby on each milestone for station tips, food, showers, hotels, and tickets. Live AI comes later.`
        : 'Mock reply · plan a route first, then ask again. Live AI comes later.',
    );
  });
}

export function bootPlanner(options: BootOptions) {
  mapsKey = options.mapsKey;

  const originEl = $('origin') as HTMLSelectElement;
  const destinationEl = $('destination') as HTMLSelectElement;

  originEl.value = 'bogor';
  destinationEl.value = 'bangkok';

  document.addEventListener('click', () => closeAllMenus());

  $('planner-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (originEl.value === destinationEl.value) {
      showToast('Pick different origin and destination');
      return;
    }
    sort = 'cheapest';
    document
      .querySelectorAll('.sort__btn')
      .forEach((btn) =>
        btn.classList.toggle('is-active', (btn as HTMLElement).dataset.sort === 'cheapest'),
      );
    runPlan(originEl.value as CityId, destinationEl.value as CityId);
  });

  $('sort-toggle').addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const next = target.dataset.sort as SortMode | undefined;
    if (!next) return;
    sort = next;
    document
      .querySelectorAll('.sort__btn')
      .forEach((btn) =>
        btn.classList.toggle('is-active', (btn as HTMLElement).dataset.sort === next),
      );
    renderAll();
    syncUrl();
  });

  $('share-btn').addEventListener('click', () => {
    void copyShare();
  });

  bootAiChat();

  const shared = parseShareUrl(new URLSearchParams(window.location.search));
  if (shared) {
    originEl.value = shared.origin;
    destinationEl.value = shared.destination;
    sort = shared.sort;
    document
      .querySelectorAll('.sort__btn')
      .forEach((btn) =>
        btn.classList.toggle('is-active', (btn as HTMLElement).dataset.sort === sort),
      );
    runPlan(shared.origin, shared.destination, shared.route);
  } else if (window.location.search) {
    showToast('Invalid share link — pick cities and plan again');
  }
}
