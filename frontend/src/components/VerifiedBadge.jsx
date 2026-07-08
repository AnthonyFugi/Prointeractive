/**
 * The customary blue verification tick — a scalloped seal with a white check.
 * Shown next to business names once an admin verifies the business.
 */
export default function VerifiedBadge({ size = 16, title = 'Verified business' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      style={{ verticalAlign: 'text-bottom', marginLeft: 4, flexShrink: 0 }}
    >
      <title>{title}</title>
      {/* 12-point scalloped seal */}
      <path
        fill="#1D9BF0"
        d="M12 1.5l2.1 1.9 2.7-.7 1.2 2.6 2.8.5-.2 2.8 2.2 1.8-1.5 2.4 1.5 2.4-2.2 1.8.2 2.8-2.8.5-1.2 2.6-2.7-.7-2.1 1.9-2.1-1.9-2.7.7-1.2-2.6-2.8-.5.2-2.8-2.2-1.8 1.5-2.4-1.5-2.4 2.2-1.8-.2-2.8 2.8-.5 1.2-2.6 2.7.7z"
      />
      <path
        d="M7.4 12.6l3 3 6.2-6.6"
        stroke="#fff"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
