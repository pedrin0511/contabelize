import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { comparePassword, generateAccessToken, JwtPayload } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const { data: office, error } = await supabase
      .from('offices')
      .select('id, name, email, password')
      .eq('email', email)
      .single()

    if (error || !office) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = comparePassword(password, office.password)

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const payload: JwtPayload = {
      officeId: office.id,
      email: office.email,
    }

    const accessToken = generateAccessToken(payload)
    const { refreshToken, expiresAt } = await createSession(
      office.id,
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || undefined
    )

    const response = NextResponse.json({
      office: { id: office.id, name: office.name, email: office.email },
      accessToken,
    })

    response.cookies.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
