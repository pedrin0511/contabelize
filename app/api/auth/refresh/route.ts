import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateAccessToken, JwtPayload } from '@/lib/auth'
import { validateSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 })
    }

    const session = await validateSession(refreshToken)
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const { data: office, error } = await supabase
      .from('offices')
      .select('id, email')
      .eq('id', session.office_id)
      .single()

    if (error || !office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 401 })
    }

    const payload: JwtPayload = {
      officeId: office.id,
      email: office.email,
    }

    const accessToken = generateAccessToken(payload)

    return NextResponse.json({ accessToken })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
