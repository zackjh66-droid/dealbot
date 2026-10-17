export default function Brand({ size = 36, showWord = true }) {
  return (
    <span className="brand">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r="15.5"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="72 18"
          transform="rotate(-32 24 24)"
        />
        <path d="M10 38 38 10" stroke="#9B7BFF" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M14 34 34 14" stroke="#D8CDFF" strokeWidth="1.2" strokeLinecap="round" opacity=".75" />
      </svg>
      {showWord ? (
        <span className="brand-word">
          <strong>PROJECT ZERO</strong>
          <span>SEASON 7 · XBOX</span>
        </span>
      ) : null}
    </span>
  );
}
