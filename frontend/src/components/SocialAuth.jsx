import { useEffect, useRef, useState } from 'react';

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

/**
 * Optional social sign-in, shown beneath the email/password form.
 * Each provider appears only when its client ID is configured, so the page
 * behaves exactly as before when nothing is set up.
 */
export default function SocialAuth({ onGoogle, onApple, label = 'or continue with' }) {
  const googleHolder = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!GOOGLE_ID) return;
    let cancelled = false;
    loadScript(GOOGLE_SRC)
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleHolder.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_ID,
          callback: (response) => onGoogle(response.credential),
        });
        googleHolder.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleHolder.current, {
          theme: 'outline', size: 'large', shape: 'pill',
          text: 'continue_with', width: 300, logo_alignment: 'center',
        });
        setGoogleReady(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [onGoogle]);

  useEffect(() => {
    if (!APPLE_ID || !APPLE_REDIRECT) return;
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
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const appleSignIn = async () => {
    setError('');
    try {
      const data = await window.AppleID.auth.signIn();
      await onApple(data.authorization?.id_token, data.user?.name);
    } catch (err) {
      // The user closing the Apple popup is not an error worth showing
      if (err?.error && err.error !== 'popup_closed_by_user') {
        setError('Apple sign-in was cancelled or failed.');
      }
    }
  };

  if (!googleReady && !appleReady) return null;

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <div className="or-divider"><span>{label}</span></div>
      <div className="social-row">
        {GOOGLE_ID && <div ref={googleHolder} />}
        {appleReady && (
          <button type="button" className="btn-apple" onClick={appleSignIn}>
            <svg width="15" height="18" viewBox="0 0 17 20" aria-hidden="true" fill="currentColor">
              <path d="M14.06 10.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.51zM11.87 3.9c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.06 1.69-.93 2.69.97.07 1.97-.49 2.59-1.22z" />
            </svg>
            Continue with Apple
          </button>
        )}
      </div>
      {error && <p className="error-text" style={{ textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
