import { supabase } from './supabase'

export interface ServiceData {
  client_id: string
  name: string
  type: 'recurring' | 'one_time'
  price: number
  recurrence?: 'monthly' | 'yearly' | null
  start_date: string
  end_date?: string | null
}

export interface PaymentData {
  service_id: string
  client_id: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'late'
  reference_month?: string
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function getMonthYear(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export async function generatePayments(
  serviceId: string,
  clientId: string,
  price: number,
  type: 'recurring' | 'one_time',
  recurrence: 'monthly' | 'yearly' | null,
  startDate: string,
  endDate: string | null,
  dueDay: number | null,
  installments?: number
) {
  const payments: PaymentData[] = []
  const start = new Date(startDate + 'T00:00:00')
  const day = dueDay || 1

  if (type === 'one_time') {
    const dueDate = new Date(start)
    dueDate.setDate(day)
    if (dueDate < start) dueDate.setMonth(dueDate.getMonth() + 1)

    payments.push({
      service_id: serviceId,
      client_id: clientId,
      amount: price,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      reference_month: getMonthYear(start),
    })
  } else if (type === 'recurring') {
    let monthsToGenerate = 12

    if (installments && installments > 0) {
      monthsToGenerate = installments
    } else if (endDate) {
      const end = new Date(endDate + 'T00:00:00')
      monthsToGenerate = (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) + 1
      monthsToGenerate = Math.max(1, monthsToGenerate)
    }

    for (let i = 0; i < monthsToGenerate; i++) {
      const refDate = addMonths(start, i)
      const dueDate = new Date(refDate)
      dueDate.setDate(day)
      if (dueDate < start) dueDate.setMonth(dueDate.getMonth() + 1)

      payments.push({
        service_id: serviceId,
        client_id: clientId,
        amount: price,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        reference_month: getMonthYear(refDate),
      })
    }
  }

  if (payments.length > 0) {
    const { error } = await supabase.from('payments').insert(payments)
    if (error) throw new Error('Failed to generate payments: ' + error.message)
  }

  return payments
}

export async function getServiceDashboard(serviceId: string, officeId: string) {
  const { data: service, error: svcError } = await supabase
    .from('services')
    .select(`
      *,
      clients!inner(id, name, due_day, office_id)
    `)
    .eq('id', serviceId)
    .eq('clients.office_id', officeId)
    .single()

  if (svcError || !service) throw new Error('Service not found')

  const { data: payments, error: payError } = await supabase
    .from('payments')
    .select('*')
    .eq('service_id', serviceId)
    .order('due_date', { ascending: true })

  if (payError) throw new Error('Failed to fetch payments')

  const now = new Date()
  const updatedPayments = payments.map((p: Record<string, unknown>) => {
    if (p.status === 'pending' && new Date(p.due_date as string) < now) {
      return { ...p, status: 'late' }
    }
    return p
  })

  const paid = updatedPayments.filter((p: Record<string, unknown>) => p.status === 'paid')
  const pending = updatedPayments.filter(
    (p: Record<string, unknown>) => p.status === 'pending' || p.status === 'late'
  )
  const lateCount = updatedPayments.filter(
    (p: Record<string, unknown>) => p.status === 'late'
  ).length

  const totalPaid = paid.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0)
  const totalPending = pending.reduce(
    (sum: number, p: Record<string, unknown>) => sum + Number(p.amount),
    0
  )
  const totalContract = updatedPayments.reduce(
    (sum: number, p: Record<string, unknown>) => sum + Number(p.amount),
    0
  )

  return {
    service,
    payments: updatedPayments,
    dashboard: {
      totalPaid,
      totalPending,
      totalContract,
      paidCount: paid.length,
      pendingCount: pending.length,
      lateCount,
      urgentAlert: pending.length >= 3,
    },
  }
}

export async function markPaymentAsPaid(paymentId: string, serviceId: string, officeId: string) {
  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('id, client_id')
    .eq('id', serviceId)
    .single()

  if (svcError || !service) throw new Error('Service not found')

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('office_id')
    .eq('id', service.client_id)
    .single()

  if (clientError || !client || client.office_id !== officeId) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('service_id', serviceId)
    .select()
    .single()

  if (error) throw new Error('Failed to update payment')
  return data
}

export async function createManualPayment(
  serviceId: string,
  officeId: string,
  amount: number,
  dueDate: string
) {
  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('id, client_id')
    .eq('id', serviceId)
    .single()

  if (svcError || !service) throw new Error('Service not found')

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('office_id')
    .eq('id', service.client_id)
    .single()

  if (clientError || !client || client.office_id !== officeId) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      service_id: serviceId,
      client_id: service.client_id,
      amount,
      due_date: dueDate,
      status: 'pending',
      reference_month: getMonthYear(new Date(dueDate + 'T00:00:00')),
    })
    .select()
    .single()

  if (error) throw new Error('Failed to create payment')
  return data
}
