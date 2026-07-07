export default function Rating({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span className="muted">
      <span className="rating-stars" aria-label={`${value} out of 5 stars`}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      {count != null && <span> ({count})</span>}
    </span>
  );
}
