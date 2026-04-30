// ⚠️  BEFORE PRODUCTION: Enable RLS on `profiles` and `checkins` tables in Supabase.
//    Policies must use Firebase UID (not current_setting). RLS is disabled during dev.

import { supabase } from './supabase'
import type { CheckIn } from '@/types'

// ─── Profile sync ─────────────────────────────────────────────────────────────
export async function upsertProfile(uid: string, profile: {
  email: string | null
  name: string
  unit_system: string
  height: string
  height_ft: string
  height_in: string
  age: string
  sex: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: uid, ...profile, updated_at: new Date().toISOString() })
    if (error) {
      console.error('upsertProfile error:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('upsertProfile exception:', err)
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}

// ─── Check-in sync ────────────────────────────────────────────────────────────
export async function saveCheckInToCloud(uid: string, checkIn: CheckIn): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('checkins')
      .upsert({
        id:             checkIn.id,
        user_id:        uid,
        date:           checkIn.date,
        unit_system:    checkIn.unitSystem,
        inputs:         checkIn.inputs,
        activity_level: checkIn.activityLevel,
        dashboard:      checkIn.dashboard,
      })
    if (error) {
      console.error('saveCheckInToCloud error:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('saveCheckInToCloud exception:', err)
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}

export async function loadCheckInsFromCloud(uid: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', uid)
    .order('date', { ascending: true })

  if (error) { console.error('loadCheckInsFromCloud error:', error.message); return [] }

  return (data ?? []).map(row => ({
    id:            row.id,
    date:          row.date,
    unitSystem:    row.unit_system,
    inputs:        row.inputs,
    activityLevel: row.activity_level,
    dashboard:     row.dashboard,
  }))
}

export async function deleteCheckInsFromCloud(uid: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('user_id', uid)
    if (error) {
      console.error('deleteCheckInsFromCloud error:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('deleteCheckInsFromCloud exception:', err)
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}

// ─── Profile load from cloud ──────────────────────────────────────────────────
export async function loadProfileFromCloud(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  if (error) return null
  if (!data) return null
  return {
    name:       data.name ?? 'there',
    height:     data.height ?? '',
    heightFt:   data.height_ft ?? '',
    heightIn:   data.height_in ?? '',
    age:        data.age ?? '',
    sex:        data.sex ?? 'male',
    unitSystem: data.unit_system ?? 'imperial',
    createdAt:  data.created_at ?? new Date().toISOString(),
  }
}

// ─── Migrate localStorage check-ins to cloud on first sign-in ────────────────
export async function migrateLocalToCloud(uid: string, localCheckIns: CheckIn[]) {
  if (!localCheckIns.length) return
  for (const checkIn of localCheckIns) {
    await saveCheckInToCloud(uid, checkIn)
  }
}
