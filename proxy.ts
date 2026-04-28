import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { validateSession } from '@/lib/session'

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
      return NextResponse.next()
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
