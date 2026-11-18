/**
 * Decorative, non-interactive background layer: two soft glow orbs plus a
 * faint grid, sitting behind page content (z-index handled in CSS by the
 * page containers using position: relative; z-index: 1).
 *
 * Purely visual — respects prefers-reduced-motion by not animating at all,
 * and never intercepts pointer events (pointer-events: none in CSS).
 */
function PageBackground({ grid = true }) {
  return (
    <div className="page-bg" aria-hidden="true">
      <span className="page-bg-orb orb-a" />
      <span className="page-bg-orb orb-b" />
      {grid && (
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <pattern id="page-bg-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(180,145,255,0.07)" strokeWidth="1" />
            </pattern>
            <radialGradient id="page-bg-fade" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="page-bg-mask">
              <rect width="100%" height="100%" fill="url(#page-bg-fade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#page-bg-grid)" mask="url(#page-bg-mask)" />
        </svg>
      )}
    </div>
  );
}

export default PageBackground;
