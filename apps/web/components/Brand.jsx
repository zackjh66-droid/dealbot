export default function Brand({ size = 42, showWord = true }) {
  return (
    <span className="brand">
      <svg
        className="brand-mark"
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="48" cy="48" r="34" stroke="#0A0A0F" strokeWidth="16" />
        <circle
          cx="48"
          cy="48"
          r="34"
          stroke="#F4F3F8"
          strokeWidth="12"
          strokeDasharray="72 9 72 9"
          strokeLinecap="square"
          transform="rotate(-20 48 48)"
        />
        <path d="M16 35 27 20" stroke="#0A0A0F" strokeWidth="5" strokeLinecap="square" />
        <path d="M69 76 80 61" stroke="#0A0A0F" strokeWidth="5" strokeLinecap="square" />
        <path d="M8 88 39 56 43 56 72 27 72 22 88 8" stroke="#090910" strokeWidth="11" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M8 88 39 56 43 56 72 27 72 22 88 8" stroke="#8B35FF" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M18 78 39 57" stroke="#C78DFF" strokeWidth="2" strokeLinecap="square" opacity=".85" />
        <path d="M57 41 78 20" stroke="#C78DFF" strokeWidth="2" strokeLinecap="square" opacity=".85" />
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
