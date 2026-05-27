// Shared text-based wordmark — no PNG, blends into any background colour.
// Header uses default colours; Footer overrides via CSS (.site-footer .logo-*).
export default function LogoWordmark() {
  return (
    <span className="logo-wordmark" aria-label="Platizio Global">
      <span className="logo-platizio">Platizio</span>
      <span className="logo-divider" aria-hidden="true">|</span>
      <span className="logo-scope">
        Gl
        <svg
          className="logo-globe"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7.5" />
          <ellipse cx="10" cy="10" rx="3.6" ry="7.5" />
          <line x1="2.5" y1="10" x2="17.5" y2="10" />
        </svg>
        bal
      </span>
    </span>
  )
}
