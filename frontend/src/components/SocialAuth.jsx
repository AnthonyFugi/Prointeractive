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

const AppleMark = () => (
  <svg width="17" height="18" viewBox="0 0 17 20" aria-hidden="true" fill="currentColor">
    <path d="M14.06 10.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.51zM11.87 3.9c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.06 1.69-.93 2.69.97.07 1.97-.49 2.59-1.22z" />
  </svg>
);

/**
 * Optional social sign-in, shown beneath the email/password form.
 *
 * Google uses the ID-token ("credential") flow via Google's own rendered
 * button: no client secret, no redirect URI, no server-side code exchange —
 * the browser gets a signed ID token directly and the backend verifies it
 * against Google's public keys. This is deliberately simpler than the
 * popup code-flow (which needs a matching Authorized redirect URI and a
 * secret) so there is one less thing that can be mis-configured.
 *
 * Apple has no equivalent "just render a button" API for the web, so it
 * keeps its own custom button using AppleID.auth.
 */
export default function SocialAuth({ onGoogle, onApple, label = 'or' }) {
  const googleHolder = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.info('[SocialAuth] config →', {
      google: GOOGLE_ID ? `client ID = ${GOOGLE_ID}` : 'MISSING VITE_GOOGLE_CLIENT_ID',
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
        if (cancelled || !window.google?.accounts?.id || !googleHolder.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_ID,
          callback: (response) => {
            console.info('[SocialAuth] Google ID token received:', !!response?.credential);
            if (response?.credential) onGoogle(response.credential);
          },
        });
        googleHolder.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleHolder.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 300,
          logo_alignment: 'center',
        });
        setGoogleReady(true);
        console.info('[SocialAuth] Google button ready (ID-token flow)');
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
      if (err?.error && err.error !== 'popup_closed_by_user') {
        setError('Apple sign-in was cancelled or failed.');
      }
    }
  };

  if (!GOOGLE_ID && !appleReady) return null;

  return (
    <div className="social-auth">
      <div className="or-divider"><span>{label}</span></div>
      <div className="social-row">
        {GOOGLE_ID && <div ref={googleHolder} style={{ display: 'flex', justifyContent: 'center' }} />}
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
