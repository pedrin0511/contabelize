import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('service_id')

    if (!serviceId) {
      return NextResponse.json({ error: 'service_id is required' }, { status: 400 })
    }

    const { data: service, error: svcError } = await supabase
      .from('services')
      .select('id, client_id')
      .eq('id', serviceId)
      .single()

    if (svcError || !service) {
      console.error('Service not found:', svcError, 'serviceId:', serviceId)
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('office_id')
      .eq('id', service.client_id)
      .single()

    if (clientError || !client) {
      console.error('Client not found:', clientError, 'client_id:', service.client_id)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.office_id !== payload.officeId) {
      console.error('Unauthorized:', { clientOffice: client.office_id, userOffice: payload.officeId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('service_id', serviceId)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    console.log('Payments fetched successfully:', { serviceId, count: payments?.length })
    return NextResponse.json({ payments: payments || [] })
  } catch (error) {
    console.error('Error in GET /api/payments:', error)
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
    const { service_id, amount, due_date } = body

    if (!service_id || amount === undefined || !due_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: service, error: svcError } = await supabase
      .from('services')
      .select('id, client_id')
      .eq('id', service_id)
      .single()

    if (svcError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('office_id')
      .eq('id', service.client_id)
      .single()

    if (clientError || !client || client.office_id !== payload.officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        service_id,
        client_id: service.client_id,
        amount: amountNum,
        due_date,
        status: 'pending',
        reference_month: new Date(due_date + 'T00:00:00').toISOString().slice(0, 7) + '-01',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment:', error)
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
