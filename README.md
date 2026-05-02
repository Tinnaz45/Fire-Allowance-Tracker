# Fire Allowance Tracker

A mobile-first Progressive Web App (PWA) for tracking fire allowance claims across Recalls, Retain, Standby/M&D, and Spoilt/Delayed meals. Works as a home-screen app on iPhone, and in any browser.

---

## Quick setup (estimated time: 20 minutes)

### Step 1 — Set up Supabase (free)

1. Go to https://supabase.com and create a free account.
2. Click **New project**, give it a name (e.g. `fire-allowance-tracker`), set a database password, choose a region (Australia - Sydney if available).
3. Wait ~2 minutes for your project to spin up.
4. Go to the **SQL Editor** (left sidebar).
5. Paste the entire contents of `supabase-schema.sql` and click **Run**.
   - This creates all four claim tables, the profiles table, and the row-level security policies so each user only sees their own data.
6. Go to **Settings → API**.
7. Copy your **Project URL** and **anon public** key — you'll need these next.

---

### Step 2 — Configure the app

1. In this project folder, duplicate `.env.example` and rename it `.env.local`.
2. Fill in your Supabase credentials:

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### Step 3 — Run locally

Make sure you have Node.js installed (v18+). Then:

```bash
npm install
npm start
```

The app opens at http://localhost:3000. Create an account, fill in your profile, and start adding claims.

---

### Step 4 — Deploy (so you can use it on your phone)

The easiest free option is **Vercel**:

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com, sign in with GitHub, click **New Project**, and import your repo.
3. In the project settings, add your environment variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel gives you a URL like `https://fire-allowance-tracker.vercel.app`.

---

### Step 5 — Add to iPhone home screen

1. Open Safari on your iPhone.
2. Go to your Vercel URL.
3. Tap the **Share** button (box with arrow up).
4. Scroll down and tap **Add to Home Screen**.
5. Name it "Allowance" and tap **Add**.

It now behaves like a native app — full screen, your icon, no browser bars.

---

## Each team member's setup

Each person:
1. Opens the app URL in Safari on their iPhone.
2. Adds it to their home screen.
3. Signs up with their work email.
4. Fills in their profile (name, home station, platoon, home distance).

Everyone's data is completely separate — each person only ever sees their own claims.

---

## Allowance rates

These are hardcoded in `src/lib/supabase.js` under `RATES`. Update them there when rates change.

| Allowance | Rate |
|---|---|
| Km rate | $0.43/km |
| Day mealie | $17.85 |
| Night mealie | $22.40 |
| Retain (day) | $28.50 |
| Retain (night) | $42.70 |
| Spoilt/delayed meal | $22.80 |

---

## Project structure

```
fire-allowance-tracker/
├── public/
│   ├── index.html          # PWA shell with iOS meta tags
│   └── manifest.json       # PWA manifest (icon, display, theme)
├── src/
│   ├── lib/
│   │   └── supabase.js     # Supabase client, STATIONS list, RATES
│   ├── hooks/
│   │   ├── useAuth.js      # Auth context (sign in, sign up, profile)
│   │   └── useClaims.js    # All claim CRUD operations
│   ├── components/
│   │   ├── UI.jsx          # Shared components (ClaimRow, badges, sheets)
│   │   └── BottomNav.jsx   # iOS-style tab bar
│   ├── pages/
│   │   ├── AuthPage.jsx    # Login / sign up
│   │   ├── Dashboard.jsx   # Home screen with stats + recent claims
│   │   ├── ClaimPages.jsx  # Recalls, Retain, Standby, Spoilt forms + lists
│   │   └── ProfilePage.jsx # Profile editor + allowance rates + sign out
│   ├── styles/
│   │   └── global.css      # Full design system (dark theme, mobile-first)
│   ├── App.jsx             # Root app with auth guard + navigation
│   └── index.js            # React entry point
├── supabase-schema.sql     # Run this in Supabase SQL editor once
├── .env.example            # Copy to .env.local and add your keys
└── package.json
```

---

## Development workflow

- All work happens on the `dev` branch — never commit directly to `main`
- After changes: run `npm run build` and fix any errors
- If tests exist: run `npm test -- --watchAll=false` and fix failures
- Only merge `dev → main` when the build is clean
- If anything breaks: revert in `dev`, do not merge
- Full workflow details: see [docs/WORKFLOW.md](docs/WORKFLOW.md)

---

## Deployment Workflow

| Branch | Purpose |
|---|---|
| `dev` | Development and testing — all features land here first |
| `main` | Production — only receives changes via pull request from `dev` |

**Process:**

1. All features and fixes are committed to `dev`
2. Push `dev` to trigger a Vercel preview deployment
3. Test the Vercel preview URL thoroughly
4. Only after verification: open a pull request from `dev` → `main`
5. Merge to `main` triggers the production Vercel deployment

**Never push directly to `main`.** Direct pushes are blocked by branch protection.

---

## Future features to add

- Push notifications when a claim is approaching a deadline
- Export to PDF / CSV for payslip reconciliation
- Pay period summary view (group claims by pay number)
- Photo attachment for receipts
- Offline support (service worker caching)
