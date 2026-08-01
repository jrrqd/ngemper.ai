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

function renderMilestones(route: RouteAlternative) {
  const root = $('milestone-list');
  root.innerHTML = '';
  route.milestones.forEach((m, index) => {
    const card = document.createElement('article');
    card.className = `milestone${m.crossBorder ? ' is-border' : ''}`;
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

    card.innerHTML = `
      <div class="milestone__meta">
        <span>${index + 1}. ${m.mode}</span>
        <span>${formatDuration(m.durationMin)} · ${formatIdr(m.priceIdr)}${badges}</span>
      </div>
      <p class="milestone__sub">${m.from} → ${m.to}</p>
      ${ticketLink}
      ${checklist}
      ${renderSnapshot(m, index)}
    `;
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

export function bootPlanner(options: BootOptions) {
  mapsKey = options.mapsKey;

  const originEl = $('origin') as HTMLSelectElement;
  const destinationEl = $('destination') as HTMLSelectElement;

  originEl.value = 'bogor';
  destinationEl.value = 'bangkok';

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
