import { useState } from 'react';

export default function ImageCarousel({ images = [], alt = '' }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div>
      <div className="carousel">
        <img src={images[idx]} alt={alt} />
        {images.length > 1 && (
          <>
            <button type="button" className="carousel-arrow left" onClick={prev} aria-label="Previous image">‹</button>
            <button type="button" className="carousel-arrow right" onClick={next} aria-label="Next image">›</button>
            <div className="carousel-dots">
              {images.map((_, i) => (
                <span key={i} className={i === idx ? 'on' : ''} />
              ))}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="carousel-thumbs">
          {images.map((url, i) => (
            <button type="button" key={url} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
