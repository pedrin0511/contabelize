import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAccessToken } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { id } = await params

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select(`
        id,
        service_id,
        services!inner(
          clients!inner(office_id)
        )
      `)
      .eq('id', id)
      .single()

    if (payError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const paymentRecord = payment as Record<string, unknown>
    const service = paymentRecord.services as Record<string, unknown>
    const client = service?.clients as Record<string, unknown>

    if (client?.office_id !== payload.officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })

    return NextResponse.json({ payment: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
