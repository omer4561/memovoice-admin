import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
import { ApiError, fetchOverview, fetchTester } from './api.js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';
import { esc } from './format.js';
import { renderOverview, renderTesterDetail } from './render.js';
import { strings as s } from './strings.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { detectSessionInUrl: true, persistSession: true },
});

const app = document.getElementById('app');
const toolbar = document.getElementById('toolbar');
const includeOwnerBox = document.getElementById('include-owner');

function show(html) {
  app.innerHTML = html;
}

function message(title, body, extra = '') {
  show(`<section class="card center"><h2>${esc(title)}</h2><p class="soft">${esc(body)}</p>${extra}</section>`);
}

function signInScreen() {
  toolbar.hidden = true;
  show(`<section class="card center"><h2>${esc(s.signInTitle)}</h2>
<button type="button" class="primary" data-action="sign-in">${esc(s.signInButton)}</button></section>`);
}

async function currentToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function loadOverview() {
  const token = await currentToken();
  if (!token) return signInScreen();

  toolbar.hidden = false;
  show(`<p class="soft center">${esc(s.loading)}</p>`);
  try {
    const data = await fetchOverview(token, includeOwnerBox.checked);
    show(renderOverview(data, s));
  } catch (error) {
    await handleError(error);
  }
}

async function loadTester(userId) {
  const token = await currentToken();
  if (!token) return signInScreen();

  show(`<p class="soft center">${esc(s.loading)}</p>`);
  try {
    show(renderTesterDetail(await fetchTester(token, userId), s));
  } catch (error) {
    await handleError(error);
  }
}

async function handleError(error) {
  if (error instanceof ApiError && error.status === 403) {
    toolbar.hidden = true;
    return message(s.forbiddenTitle, s.forbiddenBody, `<button type="button" data-action="sign-out">${esc(s.signOut)}</button>`);
  }
  if (error instanceof ApiError && error.status === 401) {
    await supabase.auth.signOut();
    return signInScreen();
  }
  message(s.errorTitle, s.errorBody, `<button type="button" data-action="refresh">${esc(s.refresh)}</button>`);
}

document.addEventListener('click', async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const action = target.closest('[data-action]')?.getAttribute('data-action');
  if (action === 'sign-in') {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${location.pathname}` },
    });
  } else if (action === 'sign-out') {
    await supabase.auth.signOut();
    signInScreen();
  } else if (action === 'refresh' || action === 'back') {
    await loadOverview();
  } else {
    const row = target.closest('tr[data-user-id], li[data-user-id]');
    if (row) await loadTester(row.getAttribute('data-user-id'));
  }
});

document.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter' || !(event.target instanceof Element)) return;
  const row = event.target.closest('tr[data-user-id]');
  if (row) await loadTester(row.getAttribute('data-user-id'));
});

includeOwnerBox.addEventListener('change', loadOverview);

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
      loadOverview();
    }
  }
});
