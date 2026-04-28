import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(
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

    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        clients:client_id (id, name, due_day, document)
      `)
      .eq('id', id)
      .eq('clients.office_id', payload.officeId)
      .single()

    if (error || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const { data: existingService, error: fetchError } = await supabase
      .from('services')
      .select(`
        id,
        clients!inner(office_id)
      `)
      .eq('id', id)
      .eq('clients.office_id', payload.officeId)
      .single()

    if (fetchError || !existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, type, price, recurrence, start_date, end_date } = body

    if (type && type !== 'recurring' && type !== 'one_time') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (price !== undefined) {
      const priceNum = Number(price)
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
      }
      updateData.price = priceNum
    }
    if (recurrence !== undefined) updateData.recurrence = recurrence
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date

    const { data: service, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !service) {
      return NextResponse.json({ error: 'Service not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ service })
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

    const { data: existingService, error: fetchError } = await supabase
      .from('services')
      .select(`
        id,
        clients!inner(office_id)
      `)
      .eq('id', id)
      .eq('clients.office_id', payload.officeId)
      .single()

    if (fetchError || !existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
