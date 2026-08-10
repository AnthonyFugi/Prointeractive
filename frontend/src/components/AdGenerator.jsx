import { useEffect, useRef, useState } from 'react';
import { money } from '../api.js';

const NAVY = '#002368';
const RED = '#bc0000';
const SIZE = 1080;

function drawContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const err = new Error('Image failed to load — likely missing CORS access for this origin.');
      err.name = 'ImageLoadError';
      reject(err);
    };
    img.src = src;
  });
}

// Rounded-rect helper for browsers/canvas versions without ctx.roundRect.
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}

export default function AdGenerator({ product, onClose }) {
  const canvasRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [blob, setBlob] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError('');
      try {
        await document.fonts.ready;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = SIZE;
        canvas.height = SIZE;

        // Bold navy background — this is what actually reads as "promotional
        // graphic" rather than "information card". The product photo then
        // sits on a white spotlight card, which gives it depth against the
        // colour rather than blending into a flat white page.
        ctx.fillStyle = NAVY;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Platform mark — the real logo image, not a typed wordmark.
        try {
          const logo = await loadImage('/logo.png');
          if (cancelled) return;
          ctx.drawImage(logo, 56, 50, 64, 64);
        } catch (_e) { /* same-origin asset — failure here is unexpected but non-fatal */ }
        ctx.fillStyle = '#fff';
        ctx.font = "800 40px 'Bricolage Grotesque', sans-serif";
        ctx.textBaseline = 'middle';
        ctx.fillText('Pro·interactive', 134, 82);

        // Product photo — white spotlight card for contrast against navy.
        const photoBox = { x: 90, y: 170, w: SIZE - 180, h: 500 };
        ctx.fillStyle = '#fff';
        roundRect(ctx, photoBox.x, photoBox.y, photoBox.w, photoBox.h, 28);
        ctx.fill();

        if (product.images?.[0]) {
          const img = await loadImage(product.images[0]);
          if (cancelled) return;
          ctx.save();
          roundRect(ctx, photoBox.x, photoBox.y, photoBox.w, photoBox.h, 28);
          ctx.clip();
          drawContain(ctx, img, photoBox.x + 24, photoBox.y + 24, photoBox.w - 48, photoBox.h - 48);
          ctx.restore();
        }

        // SALE sticker — rotated for a bit of energy, not a flat label.
        if (product.onSale) {
          ctx.save();
          ctx.translate(photoBox.x + 85, photoBox.y + 60);
          ctx.rotate(-0.26);
          ctx.fillStyle = RED;
          roundRect(ctx, -95, -34, 190, 68, 8);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = "800 34px 'Bricolage Grotesque', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText('SALE', 0, 2);
          ctx.textAlign = 'left';
          ctx.restore();
        }

        // Product name — large, white, on navy.
        let y = photoBox.y + photoBox.h + 68;
        ctx.fillStyle = '#fff';
        ctx.font = "800 44px 'Bricolage Grotesque', sans-serif";
        y = wrapText(ctx, product.name, 60, y, SIZE - 120, 52, 2);

        // Price — a real graphic element (a bold red pill), not plain text.
        y += 46;
        const priceStr = money(product.onSale ? product.effectivePrice : product.price, product.currency);
        ctx.font = "800 52px 'Bricolage Grotesque', sans-serif";
        const priceWidth = ctx.measureText(priceStr).width;
        const pillPad = 34;
        const pillW = priceWidth + pillPad * 2;
        const pillH = 86;
        ctx.fillStyle = RED;
        roundRect(ctx, 60, y - pillH / 2, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceStr, 60 + pillPad, y + 4);

        if (product.onSale) {
          const original = money(product.price, product.currency);
          ctx.font = "600 30px 'Karla', sans-serif";
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          const ox = 60 + pillW + 24;
          ctx.fillText(original, ox, y);
          const strikeW = ctx.measureText(original).width;
          ctx.beginPath();
          ctx.moveTo(ox, y - 2);
          ctx.lineTo(ox + strikeW, y - 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Seller row — real business logo image where available, name, and
        // the verified mark, styled like a proper seller byline.
        y += 90;
        let bizX = 60;
        if (product.business?.logoUrl) {
          try {
            const bizLogo = await loadImage(product.business.logoUrl);
            if (cancelled) return;
            ctx.save();
            ctx.beginPath();
            ctx.arc(bizX + 26, y, 26, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = '#fff';
            ctx.fillRect(bizX, y - 26, 52, 52);
            drawContain(ctx, bizLogo, bizX, y - 26, 52, 52);
            ctx.restore();
            bizX += 68;
          } catch (_e) { /* missing/blocked business logo — fall back to text-only, non-fatal */ }
        }
        ctx.font = "700 30px 'Karla', sans-serif";
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        const bizLine = product.business?.verified ? `${product.business.name}  ✓` : (product.business?.name || '');
        ctx.fillText(bizLine, bizX, y);

        // CTA band — a genuine call to action, not quiet footer text.
        ctx.fillStyle = RED;
        ctx.fillRect(0, SIZE - 110, SIZE, 110);
        ctx.fillStyle = '#fff';
        ctx.font = "800 34px 'Bricolage Grotesque', sans-serif";
        ctx.fillText('🛍️ Shop now on Prointeractive', 60, SIZE - 68);
        ctx.font = "600 24px 'Karla', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`prointapp.com/products/${product._id}`, 60, SIZE - 32);

        canvas.toBlob((b) => {
          if (cancelled || !b) return;
          setBlob(b);
          setPreviewUrl(URL.createObjectURL(b));
        }, 'image/png');
      } catch (e) {
        if (!cancelled) {
          if (e.name === 'SecurityError' || e.name === 'ImageLoadError') {
            setError("Couldn't generate the image right now. Please try again shortly, or let us know if this keeps happening.");
          } else {
            setError('Something went wrong creating the ad. Please try again.');
          }
          // eslint-disable-next-line no-console
          console.error('AdGenerator failed:', e.name, e.message);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [product]);

  const download = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${product.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-ad.png`;
    a.click();
  };

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], 'ad.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: product.name,
          text: `${product.name} — ${money(product.onSale ? product.effectivePrice : product.price, product.currency)} on Prointeractive`,
        });
      } catch (_e) { /* user cancelled — not an error */ }
    }
  };

  const canShareFiles = typeof navigator.canShare === 'function';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div className="panel" style={{ maxWidth: 420, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>📢 Shareable ad</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        {error ? (
          <p className="error-text">{error}</p>
        ) : previewUrl ? (
          <img src={previewUrl} alt="Generated ad preview" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--line)' }} />
        ) : (
          <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="muted">Generating…</span>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {previewUrl && !error && (
          <div className="row" style={{ marginTop: '1rem', gap: '0.5rem' }}>
            <button className="btn btn-navy" style={{ flex: 1 }} onClick={download}>⬇ Download</button>
            {canShareFiles && (
              <button className="btn btn-red" style={{ flex: 1 }} onClick={share}>↗ Share</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + (lines.length - 1) * lineHeight;
}
