import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

// Custom cookie-based storage helper to share Supabase session across subdomains of secrtelecom.com
const customCookieStorage = {
  getItem(key) {
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  },
  setItem(key, value) {
    let valueToStore = value;
    if (key.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.user) delete parsed.user;
        valueToStore = JSON.stringify(parsed);
      } catch (e) {}
    }
    document.cookie = `${key}=${encodeURIComponent(valueToStore)};path=/;domain=.secrtelecom.com;SameSite=Lax;Secure`;
  },
  removeItem(key) {
    document.cookie = `${key}=;path=/;domain=.secrtelecom.com;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax;Secure`;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customCookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});
