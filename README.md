# mybmi.ai

AI-powered personal health platform — BMI, BMR, TDEE and Body Fat calculators with personalized health plans, progress tracking, and cloud sync.

## Stack

- **Frontend:** React 19 + TypeScript + Vite 7
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **PDF:** jsPDF
- **Auth:** Firebase Authentication (Google + Email/Password)
- **Database:** Supabase Postgres (cloud sync for profiles + check-ins)
- **Storage:** localStorage (offline-first, syncs to cloud when signed in)
- **PWA:** Offline-capable, installable on mobile

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- Git

Check your versions:

```bash
node -v   # should be 18+
npm -v    # should be 9+
git --version
```

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/koushikxtr30-source/bmi-ai.git
cd bmi-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Create a `.env` file in the project root:

```bash
touch .env
```

Add the following variables (ask the project owner for the actual values):

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note:** The `.env` file is git-ignored and not included in the repo. You need the actual values to enable authentication and cloud sync. Without them, the app still works with local storage only.

### 4. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Access from other devices on the same network (optional)

```bash
npm run dev -- --host
```

Then open `http://<your-ip>:5173` on your phone or another device.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
  App.tsx                  Main app (719 lines — state, routing, data flow)
  App.css                  Custom styles, animations, mobile tab bar
  index.css                Tailwind config, CSS variables, theme

  types/index.ts           TypeScript type definitions
  constants/index.ts       App constants

  lib/
    firebase.ts            Firebase Auth config
    supabase.ts            Supabase client config
    db.ts                  Cloud database operations (profiles, check-ins)
    storage.ts             localStorage read/write helpers
    calculations.ts        BMI, BMR, TDEE, Body Fat math
    aiPlan.ts              AI health plan generator (rule-based)
    pdf.ts                 PDF report generator

  components/
    AuthPage.tsx            Sign-in / Sign-up page
    HomePage.tsx            Main home screen with stats + insights
    CheckinWizard.tsx       Step-by-step check-in flow
    DashboardPage.tsx       Full dashboard with all metrics
    DashboardPanel.tsx      Slide-out dashboard panel
    ProgressPage.tsx        Weight trend charts + history
    AccountPage.tsx         Account settings + integrations
    ResultsPayoff.tsx       Post-onboarding results screen
    WelcomeAnimation.tsx    Returning user welcome animation
    AIPlanSection.tsx       AI health plan display
    ArcGauge.tsx            BMI arc gauge widget
    SharedFields.tsx        Reusable form fields
    Toast.tsx               Toast notification
    InstallPrompt.tsx       PWA install banner
    ui/                     shadcn/ui components
```

## How it works

1. **First visit:** Onboarding wizard collects height, weight, age, sex, activity level
2. **Dashboard:** Calculates BMI, BMR, TDEE, Body Fat with Smart Insights
3. **Check-ins:** Log weight over time to track progress
4. **AI Health Plan:** Generates personalized diet + exercise plan based on your stats
5. **PDF Export:** Download a health report
6. **Cloud sync:** Sign in with Google or email to sync data across devices
