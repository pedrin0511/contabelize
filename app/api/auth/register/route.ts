import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword, generateAccessToken, JwtPayload } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: existingOffice } = await supabase
      .from('offices')
      .select('id')
      .eq('email', email)
      .single()

    if (existingOffice) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = hashPassword(password)

    const { data: office, error: officeError } = await supabase
      .from('offices')
      .insert({
        name,
        email,
        password: passwordHash,
      })
      .select()
      .single()

    if (officeError) {
      console.log(officeError)
      return NextResponse.json({ error: 'Failed to create office' }, { status: 500 })
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
      expires: expiresAt,
      path: '/',
    })

    return response
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
