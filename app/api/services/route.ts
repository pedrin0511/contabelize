import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAccessToken } from '@/lib/auth'
import { generatePayments, ServiceData } from '@/lib/services'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    let query = supabase
      .from('services')
      .select(`
        *,
        clients:client_id (id, name)
      `)
      .eq('office_id', payload.officeId)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: services, error } = await query.order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })

    return NextResponse.json({ services })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json()
    const { client_id, name, type, price, recurrence, start_date, end_date } = body

    if (!client_id || !name || !type || price === undefined || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type !== 'recurring' && type !== 'one_time') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (type === 'recurring' && recurrence && !['monthly', 'yearly'].includes(recurrence)) {
      return NextResponse.json({ error: 'Invalid recurrence' }, { status: 400 })
    }

    const priceNum = Number(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, due_day')
      .eq('id', client_id)
      .eq('office_id', payload.officeId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: service, error: svcError } = await supabase
      .from('services')
      .insert({
        client_id,
        name,
        type,
        price: priceNum,
        recurrence: type === 'recurring' ? recurrence : null,
        start_date,
        end_date: end_date || null,
      })
      .select()
      .single()

    if (svcError || !service) {
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
    }

    await generatePayments(
      service.id,
      client.id,
      priceNum,
      type,
      type === 'recurring' ? recurrence : null,
      start_date,
      end_date || null,
      client.due_day,
      body.installments ? Number(body.installments) : undefined
    )

    return NextResponse.json({ service }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
