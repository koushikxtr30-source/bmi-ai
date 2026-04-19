import type { CheckIn, UserProfile } from '@/types'

// ─── Check-ins ────────────────────────────────────────────────────────────────
export const STORAGE_KEY = 'mybmi_checkins'

export function loadCheckIns(): CheckIn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveCheckIn(c: CheckIn): boolean {
  try {
    const existing = loadCheckIns()
    existing.push(c)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    return true
  } catch (err) {
    console.error('saveCheckIn failed:', err)
    return false
  }
}

export function deleteCheckIns(): boolean {
  try { localStorage.removeItem(STORAGE_KEY); return true }
  catch (err) { console.error('deleteCheckIns failed:', err); return false }
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export const PROFILE_KEY = 'mybmi_profile'

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(p: UserProfile): boolean {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); return true }
  catch (err) { console.error('saveProfile failed:', err); return false }
}

export function deleteProfile(): boolean {
  try { localStorage.removeItem(PROFILE_KEY); return true }
  catch (err) { console.error('deleteProfile failed:', err); return false }
}
