export default function Brand({ size = 38, showWord = true }) {
  return (
    <span className="brand">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="pzg" x1="6" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C4A1FF" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <path d="M24 2.5 43 13.5v21L24 45.5 5 34.5v-21L24 2.5Z" stroke="url(#pzg)" strokeWidth="1.4" />
        <path d="M24 8.5 38 16.5v15L24 39.5 10 31.5v-15L24 8.5Z" stroke="#A88CFF" strokeOpacity="0.28" strokeWidth="0.9" />
        <path
          d="M31.8 15.4c-2.2-1.6-5-2.4-7.9-2.4-5.6 0-10 4.6-10 10.5S18.3 34 23.9 34c3 0 5.7-1 7.9-2.7"
          stroke="url(#pzg)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path d="M32.6 14.6 38 10" stroke="#F2C45A" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      {showWord ? (
        <span className="brand-word">
          <strong>PROJECT ZERO</strong>
          <span>CONSOLE DIVISION</span>
        </span>
      ) : null}
    </span>
  );
}
