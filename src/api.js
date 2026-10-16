import { FUNCTION_URL, SUPABASE_ANON_KEY } from './config.js';

/** שגיאה עם קוד ה-HTTP, כדי שהמסך יבדיל בין "אין הרשאה" לבין תקלה. */
export class ApiError extends Error {
  constructor(status) {
    super(`api_${status}`);
    this.status = status;
  }
}

async function call(token, body) {
  let response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0);
  }
  if (!response.ok) throw new ApiError(response.status);
  return response.json();
}

export function fetchOverview(token, includeOwner) {
  return call(token, { action: 'overview', includeOwner });
}

export function fetchTester(token, userId) {
  return call(token, { action: 'tester', userId });
}
