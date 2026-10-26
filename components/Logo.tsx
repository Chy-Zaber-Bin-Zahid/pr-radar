export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" opacity=".35" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.6" opacity=".6" />
      <path d="M12 12 L19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="16.5" cy="9" r="1.4" fill="var(--accent)" />
    </svg>
  );
}
