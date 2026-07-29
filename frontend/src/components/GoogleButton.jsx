import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Renders Google's official "Continue with Google" button.
 * Silent no-op when VITE_GOOGLE_CLIENT_ID is unset, so the page never breaks.
 */
export default function GoogleButton({ onCredential, text = 'continue_with' }) {
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const render = () => {
      if (!window.google?.accounts?.id || !holder.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        holder.current.innerHTML = '';
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: 320,
          logo_alignment: 'center',
        });
      } catch (_err) {
        setFailed(true);
      }
    };

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', render);
      render();
      return () => existing.removeEventListener('load', render);
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);
  }, [onCredential, text]);

  if (!CLIENT_ID || failed) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div ref={holder} style={{ display: 'flex', justifyContent: 'center' }} />
      <div className="or-divider"><span>or</span></div>
    </div>
  );
}
