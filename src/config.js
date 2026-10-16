// כתובת הפרויקט והמפתח הציבורי (anon) שלו. המפתח הזה ציבורי בכוונה: האפליקציה
// עצמה מחזיקה אותו, והוא לא נותן גישה לשום נתון בלי כניסה והרשאות. הנתונים עצמם
// מוגנים בשרת: הפונקציה admin-overview בודקת טוקן ומייל מורשה לפני שהיא מחזירה משהו.
export const SUPABASE_URL = 'https://bijcqijyrpymlhaatupg.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpamNxaWp5cnB5bWxoYWF0dXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTQxNDgsImV4cCI6MjEwMTc3MDE0OH0.9c2xTVEazmMbjvOmkg37j7hkCf9QSs-W_QnrKia3mjA';
export const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-overview`;
