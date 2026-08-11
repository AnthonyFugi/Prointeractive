// Extracts a soft, pastel accent colour from a logo image — used as a subtle
// background wash behind each business's logo on the directory cards.
//
// The tricky part isn't sampling pixels, it's ignoring the ones that don't
// represent the business's actual brand colour: most logos sit on a white
// (or transparent) background, and a naive average would just come out
// white or grey. So near-white, near-black, and transparent pixels are
// excluded before averaging — what's left is much more likely to be the
// logo's real ink.
//
// Results are cached in memory by URL, since the same logo gets requested
// repeatedly as someone browses the directory.

const cache = new Map();

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

export function getDominantColor(imageUrl) {
  if (!imageUrl) return Promise.resolve(null);
  if (cache.has(imageUrl)) return Promise.resolve(cache.get(imageUrl));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const SIZE = 40; // small sample canvas — plenty for an average colour, stays fast
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const [pr, pg, pb, pa] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (pa < 100) continue; // transparent
          const isNearWhite = pr > 235 && pg > 235 && pb > 235;
          const isNearBlack = pr < 20 && pg < 20 && pb < 20;
          if (isNearWhite || isNearBlack) continue;
          r += pr; g += pg; b += pb; count++;
        }

        if (count === 0) {
          // Logo has no real colour to extract (pure black/white/transparent) —
          // no wash is better than a meaningless grey one.
          console.warn('[dominantColor] no non-white/black/transparent pixels found:', imageUrl);
          cache.set(imageUrl, null);
          resolve(null);
          return;
        }

        const [hue] = rgbToHsl(r / count, g / count, b / count);
        // Force a consistently soft, pastel result regardless of how bold or
        // dark the source colour was — keep the hue, normalise everything else.
        const color = `hsl(${Math.round(hue)}, 45%, 94%)`;
        cache.set(imageUrl, color);
        resolve(color);
      } catch (e) {
        // Most likely a CORS gap on whatever's hosting the image — fail
        // silently for the user, the card just keeps its plain background,
        // but log the real cause so it's actually debuggable.
        console.warn('[dominantColor] canvas read failed (likely CORS) for:', imageUrl, e.name, e.message);
        cache.set(imageUrl, null);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('[dominantColor] image failed to load entirely (likely CORS) for:', imageUrl);
      cache.set(imageUrl, null);
      resolve(null);
    };

    img.src = imageUrl;
  });
}
