import { useEffect, useRef, useState } from 'react';
import { money } from '../api.js';

const NAVY = '#002368';
const RED = '#bc0000';
const PAPER = '#fafafa';
const SIZE = 1080;

// Draws an image into a target box using "object-fit: contain" behaviour —
// canvas has no native equivalent, so this computes it by hand.
function drawContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required for the canvas to remain exportable when the image comes
    // from a different origin (our S3 bucket) — without this, the canvas
    // is "tainted" and toBlob()/toDataURL() throw a SecurityError even
    // though the image displays completely normally on the page itself.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
        await document.fonts.ready; // avoid drawing with a fallback font mid-load
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = SIZE;
        canvas.height = SIZE;

        // Background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Header band
        ctx.fillStyle = NAVY;
        ctx.fillRect(0, 0, SIZE, 150);
        ctx.fillStyle = '#fff';
        ctx.font = "700 52px 'Bricolage Grotesque', sans-serif";
        ctx.textBaseline = 'middle';
        ctx.fillText('Pro·interactive', 60, 78);
        ctx.font = "600 22px 'Karla', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('MAKING BUSINESS INTERACTION, EASY!', 60, 122);

        // Product photo card
        const photoBox = { x: 90, y: 200, w: SIZE - 180, h: 560 };
        ctx.fillStyle = PAPER;
        ctx.strokeStyle = '#e4e4e4';
        ctx.lineWidth = 2;
        const r = 24;
        ctx.beginPath();
        ctx.roundRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h, r);
        ctx.fill();
        ctx.stroke();

        if (product.images?.[0]) {
          const img = await loadImage(product.images[0]);
          if (cancelled) return;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h, r);
          ctx.clip();
          drawContain(ctx, img, photoBox.x + 20, photoBox.y + 20, photoBox.w - 40, photoBox.h - 40);
          ctx.restore();
        }

        // SALE ribbon — a small rotated "sticker" rather than a flat badge
        if (product.onSale) {
          ctx.save();
          ctx.translate(photoBox.x + 90, photoBox.y + 70);
          ctx.rotate(-0.26);
          ctx.fillStyle = RED;
          ctx.beginPath();
          ctx.roundRect(-95, -34, 190, 68, 8);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = "800 34px 'Bricolage Grotesque', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText('SALE', 0, 2);
          ctx.textAlign = 'left';
          ctx.restore();
        }

        // Product name
        let y = photoBox.y + photoBox.h + 70;
        ctx.fillStyle = '#111';
        ctx.font = "800 46px 'Bricolage Grotesque', sans-serif";
        wrapText(ctx, product.name, 60, y, SIZE - 120, 54, 2);

        // Price
        y += 130;
        if (product.onSale) {
          ctx.font = "600 34px 'Karla', sans-serif";
          ctx.fillStyle = '#999';
          const original = money(product.price, product.currency);
          ctx.fillText(original, 60, y);
          const strikeWidth = ctx.measureText(original).width;
          ctx.beginPath();
          ctx.moveTo(60, y - 10);
          ctx.lineTo(60 + strikeWidth, y - 10);
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.font = "800 56px 'Bricolage Grotesque', sans-serif";
          ctx.fillStyle = RED;
          ctx.fillText(money(product.effectivePrice, product.currency), 60 + strikeWidth + 24, y + 6);
        } else {
          ctx.font = "800 56px 'Bricolage Grotesque', sans-serif";
          ctx.fillStyle = RED;
          ctx.fillText(money(product.price, product.currency), 60, y);
        }

        // Business name
        y += 60;
        ctx.font = "700 30px 'Karla', sans-serif";
        ctx.fillStyle = NAVY;
        const bizLine = product.business?.verified
          ? `${product.business.name}  ✓`
          : product.business?.name || '';
        ctx.fillText(bizLine, 60, y);

        // Footer band
        ctx.fillStyle = '#e8ecf5';
        ctx.fillRect(0, SIZE - 90, SIZE, 90);
        ctx.font = "600 26px 'Karla', sans-serif";
        ctx.fillStyle = NAVY;
        ctx.fillText(`prointapp.com/products/${product._id}`, 60, SIZE - 45);

        canvas.toBlob((b) => {
          if (cancelled || !b) return;
          setBlob(b);
          setPreviewUrl(URL.createObjectURL(b));
        }, 'image/png');
      } catch (e) {
        if (!cancelled) {
          setError(
            e.name === 'SecurityError'
              ? "Couldn't generate the image right now. Please try again shortly, or let us know if this keeps happening."
              : 'Something went wrong creating the ad. Please try again.'
          );
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
          text: `${product.name} — ${money(product.effectivePrice ?? product.price, product.currency)} on Prointeractive`,
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

// Simple word-wrap for canvas text, capped at maxLines (appends … if it overflows).
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
}
