export function SocialButton({ provider, iconClass, onClick, disabled = false, loading = false }) {
  return (
    <button type="button" className="social-button" onClick={onClick} aria-label={`Continue with ${provider}`} disabled={disabled}>
      <span className="social-button__ripple" aria-hidden="true" />
      <i className={iconClass} aria-hidden="true" />
      <span>{loading ? `Connecting to ${provider}...` : `Continue with ${provider}`}</span>
    </button>
  );
}
