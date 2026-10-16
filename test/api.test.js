import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, fetchOverview, fetchTester } from '../src/api.js';

// הפונקציה admin-overview מאשרת ל-CORS רק את הכותרות האלה. כותרת נוספת (כמו apikey)
// גורמת לדפדפן לחסום את הבקשה האמיתית אחרי ה-preflight, והאתר נראה ריק.
const ALLOWED_HEADERS = ['authorization', 'content-type'];

function stubFetch(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return calls;
}

test('requests carry only the headers the function allows in CORS', async () => {
  const calls = stubFetch({ ok: true, json: async () => ({}) });
  await fetchOverview('tok', false);
  await fetchTester('tok', '11111111-1111-1111-1111-111111111111');

  assert.equal(calls.length, 2);
  for (const { init } of calls) {
    for (const name of Object.keys(init.headers)) {
      assert.ok(ALLOWED_HEADERS.includes(name.toLowerCase()), `header ${name} is not allowed by the function CORS`);
    }
    assert.equal(init.headers.Authorization, 'Bearer tok');
  }
});

test('overview sends the action and includeOwner flag', async () => {
  const calls = stubFetch({ ok: true, json: async () => ({}) });
  await fetchOverview('tok', true);
  assert.deepEqual(JSON.parse(calls[0].init.body), { action: 'overview', includeOwner: true });
});

test('a non-ok response becomes an ApiError with the status', async () => {
  stubFetch({ ok: false, status: 403, json: async () => ({}) });
  await assert.rejects(() => fetchOverview('tok', false), (error) => error instanceof ApiError && error.status === 403);
});

test('a network failure becomes an ApiError with status 0', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(() => fetchOverview('tok', false), (error) => error instanceof ApiError && error.status === 0);
});
