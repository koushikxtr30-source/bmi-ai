import type { CheckIn, UserProfile } from '@/types'

// ─── Check-ins ────────────────────────────────────────────────────────────────
export const STORAGE_KEY = 'mybmi_checkins'

export function loadCheckIns(): CheckIn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveCheckIn(c: CheckIn): void {
  try {
    const existing = loadCheckIns()
    existing.push(c)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {}
}

export function deleteCheckIns(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export const PROFILE_KEY = 'mybmi_profile'

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(p: UserProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch {}
}

export function deleteProfile(): void {
  try { localStorage.removeItem(PROFILE_KEY) } catch {}
}
