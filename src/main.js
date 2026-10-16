import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
// ?v=3 עוקף עותק ישן שנשמר בדפדפן (GitHub Pages שומר קבצים כ-10 דקות). להעלות כשמשנים אחד מהם.
import { ApiError, fetchOverview, fetchTester } from './api.js?v=3';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';
import { esc } from './format.js';
import { renderOverview, renderTesterDetail } from './render.js?v=3';
import { strings as s } from './strings.js?v=3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { detectSessionInUrl: true, persistSession: true },
});

const app = document.getElementById('app');
const toolbar = document.getElementById('toolbar');
const includeOwnerBox = document.getElementById('include-owner');
const busyLabel = document.getElementById('busy');
const refreshButton = document.querySelector('[data-action="refresh"]');

const TESTER_ROUTE = /^#\/tester\/([0-9a-f-]{36})$/i;
const FRESH_MS = 30_000;

// העתק אחרון של הסקירה: חזרה מפרטי בודק מציגה אותו מיד, וריענון רץ ברקע.
let overview = null;
let overviewIncludesOwner = false;
let overviewAt = 0;
let overviewScroll = 0;
let lastRoute = 'overview';

function show(html) {
  app.innerHTML = html;
}

function setBusy(on, text = '') {
  app.setAttribute('aria-busy', String(on));
  busyLabel.textContent = on ? text : '';
  refreshButton.disabled = on;
  refreshButton.setAttribute('aria-busy', String(on));
}

function message(title, body, extra = '') {
  show(`<section class="message"><h2>${esc(title)}</h2><p>${esc(body)}</p>${extra}</section>`);
}

function signInScreen() {
  toolbar.hidden = true;
  setBusy(false);
  overview = null;
  message(s.signInTitle, s.signInBody, `<button type="button" class="primary" data-action="sign-in">${esc(s.signInButton)}</button>`);
}

async function currentToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function currentRoute() {
  const match = TESTER_ROUTE.exec(location.hash);
  return match ? { name: 'tester', id: match[1] } : { name: 'overview' };
}

async function handleError(error) {
  setBusy(false);
  if (error instanceof ApiError && error.status === 403) {
    toolbar.hidden = true;
    return message(s.forbiddenTitle, s.forbiddenBody, `<button type="button" data-action="sign-out">${esc(s.signOut)}</button>`);
  }
  if (error instanceof ApiError && error.status === 401) {
    await supabase.auth.signOut();
    return signInScreen();
  }
  const code = error instanceof ApiError ? (error.status === 0 ? 'רשת' : error.status) : 'לא ידוע';
  message(
    s.errorTitle,
    s.errorBody,
    `<p class="note"><bdi>${esc(s.errorCode(code))}</bdi></p><button type="button" data-action="refresh">${esc(s.refresh)}</button>`
  );
}

async function showOverview(token, { force = false } = {}) {
  const include = includeOwnerBox.checked;
  const haveCopy = overview !== null && overviewIncludesOwner === include;

  if (haveCopy) {
    show(renderOverview(overview, s));
    window.scrollTo(0, overviewScroll);
    if (!force && Date.now() - overviewAt < FRESH_MS) return;
  }

  setBusy(true, haveCopy ? s.refreshing : s.loading);
  if (!haveCopy) show(`<p class="soft">${esc(s.loading)}</p>`);

  try {
    const data = await fetchOverview(token, include);
    overview = data;
    overviewIncludesOwner = include;
    overviewAt = Date.now();
    // המשתמש עבר בינתיים לפרטי בודק: לא דורסים לו את המסך.
    if (currentRoute().name !== 'overview') return setBusy(false);
    const y = window.scrollY;
    show(renderOverview(data, s));
    window.scrollTo(0, haveCopy ? y : 0);
    setBusy(false);
  } catch (error) {
    if (haveCopy) setBusy(false, '');
    else await handleError(error);
  }
}

async function showTester(token, userId) {
  setBusy(true, s.loading);
  show(`<a class="back" href="#/">${esc(s.back)}</a><p class="soft">${esc(s.loading)}</p>`);
  try {
    const data = await fetchTester(token, userId);
    if (currentRoute().name !== 'tester') return setBusy(false);
    show(renderTesterDetail(data, s));
    window.scrollTo(0, 0);
    setBusy(false);
  } catch (error) {
    await handleError(error);
  }
}

async function route({ force = false } = {}) {
  const token = await currentToken();
  if (!token) return signInScreen();

  toolbar.hidden = false;
  const next = currentRoute();
  if (lastRoute === 'overview' && next.name !== 'overview') overviewScroll = window.scrollY;
  lastRoute = next.name;

  if (next.name === 'tester') return showTester(token, next.id);
  return showOverview(token, { force });
}

document.addEventListener('click', async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const action = target?.closest('[data-action]')?.getAttribute('data-action');
  if (action === 'sign-in') {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${location.pathname}` },
    });
  } else if (action === 'sign-out') {
    await supabase.auth.signOut();
    signInScreen();
  } else if (action === 'refresh') {
    await route({ force: true });
  }
});

window.addEventListener('hashchange', () => route());
includeOwnerBox.addEventListener('change', () => route({ force: true }));

// supabase-js מדווח SIGNED_IN גם כשהלשונית חוזרת לפוקוס. טוענים מחדש רק כשהמשתמש
// באמת התחלף, כדי לא לזרוק מסך פרטי בודק שפתוח.
let loadedFor = null;
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    loadedFor = null;
    signInScreen();
  } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    if (!session) return signInScreen();
    if (session.user.id !== loadedFor) {
      loadedFor = session.user.id;
      route();
    }
  }
});
