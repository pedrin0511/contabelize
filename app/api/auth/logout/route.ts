import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (refreshToken) {
      await deleteSession(refreshToken)
    }

    const response = NextResponse.json({ message: 'Logged out successfully' })

    response.cookies.delete('refresh_token')
    response.cookies.delete('access_token')

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
