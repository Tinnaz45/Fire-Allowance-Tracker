export default function BottomNav({ active, onChange }) {
  const tabs = [
    { key: 'dashboard', label: 'Home', icon: HomeIcon },
    { key: 'recalls', label: 'Recalls', icon: RecallIcon },
    { key: 'retain', label: 'Retain', icon: RetainIcon },
    { key: 'standby', label: 'Standby', icon: StandbyIcon },
    { key: 'mand', label: 'M&D', icon: MandIcon },
    { key: 'spoilt', label: 'Meals', icon: MealIcon },
    { key: 'stations', label: 'Stations', icon: StationsIcon },
    { key: 'profile', label: 'Profile', icon: ProfileIcon },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`nav-tab ${active === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
          aria-label={label}
        >
          <Icon active={active === key} />
          {label}
        </button>
      ))}
    </nav>
  )
}

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M5 10v11h14V10" />
    </svg>
  )
}

function RecallIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" /><path d="M12 7v5l3 3" />
    </svg>
  )
}

function RetainIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function StandbyIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function MandIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
      <path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" />
    </svg>
  )
}

function MealIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

function StationsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
