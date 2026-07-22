export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <div className="loader" />
      <span className="muted">{label}</span>
    </div>
  );
}
