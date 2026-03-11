import type { CheckIn } from '@/types'

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
