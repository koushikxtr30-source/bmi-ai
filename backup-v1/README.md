# Backup v1 — BMI Calculator (baseline)
Date: 2026-02-24

## What's in this backup
Snapshot of the app after the initial 5 fixes were applied:
1. ✅ Dark/light mode toggle (fixed — now applies class to <html>)
2. ✅ BMI gauge arc with needle
3. ✅ Ideal weight range display in results
4. ✅ Age & sex fields with context-aware health tips
5. ✅ Smoother fadeInUp animation

## Files
- App.tsx     — main React component
- index.css   — global styles + dark/light CSS variables
- App.css     — component-level styles
- main.tsx    — entry point

## To restore
Copy these files back to /src/:
  cp backup-v1/App.tsx src/App.tsx
  cp backup-v1/index.css src/index.css
  cp backup-v1/App.css src/App.css
  cp backup-v1/main.tsx src/main.tsx

## Next step (Category 01 completion)
- BMR calculator
- TDEE calculator
- Body fat % calculator
- Dashboard with range slider
