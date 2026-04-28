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

    const now = new Date()
    const year = now.getFullYear()
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // Buscar IDs dos clientes do office
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('office_id', payload.officeId)

    if (clientsError) {
      console.error('Clients error:', clientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    const clientIds = clients.map(c => c.id)

    // Buscar pagamentos filtrando por client_ids
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status, due_date, paid_at')
      .in('client_id', clientIds)
      .or(`due_date.gte.${yearStart},paid_at.gte.${yearStart}`)
      .or(`due_date.lte.${yearEnd},paid_at.lte.${yearEnd}`)

    if (paymentsError) {
      console.error('Payments error:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Contar serviços
    const { count: servicesCount, error: svcError } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .in('client_id', clientIds)

    if (svcError) {
      console.error('Services error:', svcError)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    const currentYearPayments = payments.filter(p => {
      const date = new Date(p.paid_at || p.due_date)
      return date.getFullYear() === year
    })

    const totalReceived = currentYearPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const totalPending = currentYearPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const totalOverdue = currentYearPayments
      .filter(p => p.status === 'pending' && new Date(p.due_date) < now)
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const totalPayments = currentYearPayments.length

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      received: 0,
      pending: 0,
    }))

    currentYearPayments.forEach(p => {
      const date = new Date(p.paid_at || p.due_date)
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth()
        if (p.status === 'paid') {
          monthlyRevenue[monthIndex].received += Number(p.amount)
        } else {
          monthlyRevenue[monthIndex].pending += Number(p.amount)
        }
      }
    })

    return NextResponse.json({
      total_received: totalReceived,
      total_pending: totalPending,
      total_overdue_amount: totalOverdue,
      total_payments: totalPayments,
      total: totalReceived + totalPending,
      total_services: servicesCount || 0,
      total_clients: clientIds.length,
      monthly_revenue: monthlyRevenue,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
