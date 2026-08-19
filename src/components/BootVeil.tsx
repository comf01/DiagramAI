export function BootVeil({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950 transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : ""
      }`}
      aria-hidden={leaving}
    >
      <svg width="76" height="76" viewBox="0 0 32 32">
        <path
          d="M13 18.5L19.5 11.5"
          stroke="#55617F"
          strokeWidth="2.2"
          strokeLinecap="round"
          pathLength={1}
          className="draw"
        />
        <circle
          cx="10"
          cy="21.5"
          r="4"
          fill="none"
          stroke="#FF7A66"
          strokeWidth="2.4"
          pathLength={1}
          className="draw"
          style={{ animationDelay: "0.18s" }}
        />
        <circle
          cx="22.5"
          cy="9"
          r="4.5"
          fill="none"
          stroke="#FFB224"
          strokeWidth="2.4"
          pathLength={1}
          className="draw"
          style={{ animationDelay: "0.34s" }}
        />
        <circle
          cx="23"
          cy="21"
          r="3.2"
          fill="none"
          stroke="#35D3C0"
          strokeWidth="2.4"
          pathLength={1}
          className="draw"
          style={{ animationDelay: "0.5s" }}
        />
      </svg>
      <div className="fade-late mt-4 font-display text-[22px] font-bold tracking-tight text-ink-100">
        Driftboard
      </div>
      <div
        className="fade-late mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.28em] text-ink-400"
        style={{ animationDelay: "0.85s" }}
      >
        warming the canvas
      </div>
    </div>
  );
}
