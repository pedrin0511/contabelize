import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken, generateAccessToken, JwtPayload } from '@/lib/auth'
import { validateSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export const config = {
  matcher: ['/home/:path*', '/clients/:path*', '/services/:path*'],
}

export async function proxy(request: NextRequest) {
  const tokenFromCookie = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (tokenFromCookie) {
    const payload = verifyAccessToken(tokenFromCookie)
    if (payload) {
      const headers = new Headers(request.headers)
      headers.set('x-office-id', payload.officeId)
      headers.set('x-office-email', payload.email)
      return NextResponse.next({ request: { headers } })
    }
  }

  if (refreshToken) {
    const session = await validateSession(refreshToken)
    if (session) {
      const { data: office } = await supabase
        .from('offices')
        .select('id, email')
        .eq('id', session.office_id)
        .single()

      if (office) {
        const payload: JwtPayload = {
          officeId: office.id,
          email: office.email,
        }
        const newAccessToken = generateAccessToken(payload)

        const headers = new Headers(request.headers)
        headers.set('x-office-id', payload.officeId)
        headers.set('x-office-email', payload.email)

        const response = NextResponse.next({ request: { headers } })
        response.cookies.set({
          name: 'access_token',
          value: newAccessToken,
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        })

        return response
      }
    }

    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    return response
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
