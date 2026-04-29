import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateAccessToken, JwtPayload } from '@/lib/auth'
import { validateSession, deleteSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      console.log('Refresh token not found')
      const response = NextResponse.json({ error: 'Refresh token not found' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const session = await validateSession(refreshToken)
    if (!session) {
      console.log('Sessão inválida ou expirada')
      const response = NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const { data: office, error } = await supabase
      .from('offices')
      .select('id, email')
      .eq('id', session.office_id)
      .single()

    if (error || !office) {
      console.log('Escritório não encontrado')
      await deleteSession(refreshToken)
      const response = NextResponse.json({ error: 'Office not found' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const payload: JwtPayload = {
      officeId: office.id,
      email: office.email,
    }

    const accessToken = generateAccessToken(payload)

    const response = NextResponse.json({ accessToken })
    response.cookies.set({
      name: 'access_token',
      value: accessToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })
 
    return response
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
