import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAccessToken } from '@/lib/auth'

export async function PUT(
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
    const body = await request.json()
    const { amount, due_date } = body

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

    const updateData: Record<string, unknown> = {}
    if (amount !== undefined) {
      const amountNum = Number(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }
      updateData.amount = amountNum
    }
    if (due_date !== undefined) updateData.due_date = due_date

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })

    return NextResponse.json({ payment: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const body = await request.json()
    const { action } = body

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

    if (action === 'revert') {
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'pending',
          paid_at: null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: 'Failed to revert payment' }, { status: 500 })
      return NextResponse.json({ payment: data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
