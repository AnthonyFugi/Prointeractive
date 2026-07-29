import { useEffect, useState } from 'react';

const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const APPLE_ID = import.meta.env.VITE_APPLE_CLIENT_ID;
const APPLE_REDIRECT = import.meta.env.VITE_APPLE_REDIRECT_URI;

const GOOGLE_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return undefined;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.defer = true;
    el.onload = () => { el.dataset.loaded = 'true'; resolve(); };
    el.onerror = reject;
    document.head.appendChild(el);
    return undefined;
  });

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

const AppleMark = () => (
  <svg width="17" height="18" viewBox="0 0 17 20" aria-hidden="true" fill="currentColor">
    <path d="M14.06 10.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.51zM11.87 3.9c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.06 1.69-.93 2.69.97.07 1.97-.49 2.59-1.22z" />
  </svg>
);

/**
 * Optional social sign-in, shown beneath the email/password form.
 * Each provider appears only when its client ID is configured, so the page
 * behaves exactly as before when nothing is set up.
 */
export default function SocialAuth({ onGoogle, onApple, label = 'or' }) {
  const [googleClient, setGoogleClient] = useState(null);
  const [appleReady, setAppleReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Loud on the console, quiet in the UI: makes a missing config obvious in dev
    // The client ID is public (it ships in the bundle) — printing it aids setup.
    // The client SECRET must never appear here; it lives only on the server.
    console.info('[SocialAuth] config →', {
      google: GOOGLE_ID
        ? `client ID = ${GOOGLE_ID}` + (
            /\.apps\.googleusercontent\.com$/.test(GOOGLE_ID)
              ? ''
              : '  ⚠️ THIS DOES NOT LOOK LIKE A CLIENT ID (should end in .apps.googleusercontent.com)'
          )
        : 'MISSING VITE_GOOGLE_CLIENT_ID',
      apple: APPLE_ID
        ? (APPLE_REDIRECT ? 'client ID + redirect set' : 'MISSING VITE_APPLE_REDIRECT_URI')
        : 'MISSING VITE_APPLE_CLIENT_ID (Apple does not support localhost)',
    });
  }, []);

  useEffect(() => {
    if (!GOOGLE_ID) return undefined;
    let cancelled = false;
    loadScript(GOOGLE_SRC)
      .then(() => {
        if (cancelled) return;
        if (!window.google?.accounts?.oauth2) {
          console.warn('[SocialAuth] Google script loaded but accounts.oauth2 is unavailable — ' +
            'a browser extension or tracking protection may be blocking accounts.google.com');
          return;
        }
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_ID,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response) => {
            if (response?.code) onGoogle({ code: response.code });
          },
        });
        setGoogleClient(() => client);
        console.info('[SocialAuth] Google button ready');
      })
      .catch((err) => {
        console.warn('[SocialAuth] Google sign-in unavailable:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, [onGoogle]);

  useEffect(() => {
    if (!APPLE_ID || !APPLE_REDIRECT) return undefined;
    let cancelled = false;
    loadScript(APPLE_SRC)
      .then(() => {
        if (cancelled || !window.AppleID) return;
        window.AppleID.auth.init({
          clientId: APPLE_ID,
          scope: 'name email',
          redirectURI: APPLE_REDIRECT,
          usePopup: true,
        });
        setAppleReady(true);
      })
      .catch((err) => {
        console.warn('[SocialAuth] Apple sign-in unavailable:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, []);

  const appleSignIn = async () => {
    setError('');
    try {
      const data = await window.AppleID.auth.signIn();
      await onApple(data.authorization?.id_token, data.user?.name);
    } catch (err) {
      // Closing the Apple popup is not an error worth showing
      if (err?.error && err.error !== 'popup_closed_by_user') {
        setError('Apple sign-in was cancelled or failed.');
      }
    }
  };

  if (!googleClient && !appleReady) return null;

  return (
    <div className="social-auth">
      <div className="or-divider"><span>{label}</span></div>
      <div className="social-row">
        {googleClient && (
          <button type="button" className="btn-social" onClick={() => googleClient.requestCode()}>
            <GoogleMark />
            Continue with Google
          </button>
        )}
        {appleReady && (
          <button type="button" className="btn-social" onClick={appleSignIn}>
            <AppleMark />
            Continue with Apple
          </button>
        )}
      </div>
      {error && <p className="error-text" style={{ textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
