# Development Workflow

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production — deployed via Vercel |
| `dev`  | Development — all work happens here |

**Never push directly to `main`.**

---

## Making Changes

1. Confirm you are on `dev`:
   ```bash
   git branch
   ```
2. Make your changes.
3. Run the build to confirm nothing is broken:
   ```bash
   npm run build
   ```
4. Fix any errors before continuing.
5. If tests exist, run them:
   ```bash
   npm test -- --watchAll=false
   ```
6. Fix any test failures before continuing.

---

## Merging to Main

Only merge when `dev` is stable (build passes, no test failures):

```bash
git checkout main
git merge dev
git push origin main
git checkout dev
```

Vercel auto-deploys from `main` on push.

---

## If Something Breaks

Do NOT merge to `main`. Revert your changes in `dev`:

```bash
# Undo last commit (keeps changes as unstaged)
git reset HEAD~1

# Or revert to last known-good state
git checkout -- .
```

---

## Environment Variables

- Copy `.env.example` → `.env.local`
- Fill in your Supabase credentials
- Never commit `.env.local`

---

## Supabase Rules

- Do NOT modify existing tables
- Do NOT rename columns or tables
- Schema changes must be reviewed before applying
- Auth must always be tested after any auth-adjacent change
