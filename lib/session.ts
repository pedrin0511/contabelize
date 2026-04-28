import { supabase } from './supabase'
import { generateRefreshToken, getRefreshTokenExpiry, verifyAccessToken, JwtPayload } from './auth'

export async function createSession(
  officeId: string,
  userAgent?: string,
  ipAddress?: string
) {
  const refreshToken = generateRefreshToken()
  const expiresAt = getRefreshTokenExpiry()

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      office_id: officeId,
      refresh_token: refreshToken,
      user_agent: userAgent,
      ip_address: ipAddress,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.log(error)
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return { session: data, refreshToken, expiresAt }
}

export async function findSessionByRefreshToken(refreshToken: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('refresh_token', refreshToken)
    .eq('revoked', false)
    .single()

  if (error || !data) return null
  return data
}

export async function deleteSession(refreshToken: string) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('refresh_token', refreshToken)

  if (error) throw new Error(`Failed to delete session: ${error.message}`)
}

export async function revokeAllOfficeSessions(officeId: string) {
  const { error } = await supabase
    .from('sessions')
    .update({ revoked: true })
    .eq('office_id', officeId)
    .eq('revoked', false)

  if (error) throw new Error(`Failed to revoke sessions: ${error.message}`)
}

export async function validateSession(refreshToken: string) {
  const session = await findSessionByRefreshToken(refreshToken)
  if (!session) return null

  const now = new Date()
  const expiresAt = new Date(session.expires_at)
  if (expiresAt < now) {
    await deleteSession(refreshToken)
    return null
  }

  return session
}

export function getTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}
