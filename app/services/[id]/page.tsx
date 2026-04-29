'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import Loading from '@/components/Loading'
import { formatCurrency } from '@/lib/utils'

interface Service {
  id: string
  name: string
  type: string
  price: number
  recurrence: string | null
  start_date: string
  end_date: string | null
  clients: {
    id: string
    name: string
    due_day: number | null
    document: string | null
    telefone: string | null
  }
}

interface Payment {
  id: string
  amount: number
  due_date: string
  status: string
  paid_at: string | null
  reference_month: string | null
}

interface Dashboard {
  totalPaid: number
  totalPending: number
  totalContract: number
  paidCount: number
  pendingCount: number
  lateCount: number
  urgentAlert: boolean
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [newPayment, setNewPayment] = useState({ amount: '', dueDate: '' })
const [processing, setProcessing] = useState<string | null>(null)
const [actionProcessing, setActionProcessing] = useState<{id: string, action: string} | null>(null)
const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  useEffect(() => {
    if (params.id) fetchServiceData(params.id as string)
  }, [params.id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setActiveDropdown(null)
      }
    }

    if (activeDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  async function fetchServiceData(id: string) {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        toast.error('Serviço não encontrado')
        router.push('/services')
        return
      }

      const data = await res.json()
      setService(data.service)
      await fetchPayments(id)
    } catch {
      toast.error('Erro ao carregar serviço')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPayments(serviceId: string) {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/payments?service_id=${serviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        const paymentsData = data.payments || []

        const now = new Date()
        const updatedPayments = paymentsData.map((p: Payment) => ({
          ...p,
          status:
            p.status === 'pending' && new Date(p.due_date + 'T00:00:00') < now
              ? 'late'
              : p.status,
        }))

        setPayments(updatedPayments)

        const paid = updatedPayments.filter((p: Payment) => p.status === 'paid')
        const pending = updatedPayments.filter(
          (p: Payment) => p.status === 'pending' || p.status === 'late'
        )

        setDashboard({
          totalPaid: paid.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0),
          totalPending: pending.reduce(
            (sum: number, p: Payment) => sum + Number(p.amount),
            0
          ),
          totalContract: updatedPayments.reduce(
            (sum: number, p: Payment) => sum + Number(p.amount),
            0
          ),
          paidCount: paid.length,
          pendingCount: pending.length,
          lateCount: updatedPayments.filter((p: Payment) => p.status === 'late').length,
          urgentAlert: pending.length >= 3,
        })
      } else {
        const errorData = await res.json()
        console.error('Error fetching payments:', errorData)
        toast.error(`Erro: ${errorData.error || 'Falha ao carregar pagamentos'}`)
      }
    } catch (error) {
      console.error('Exception fetching payments:', error)
      toast.error('Erro ao carregar pagamentos')
    }
  }

  async function handleMarkAsPaid(paymentId: string) {
    setActionProcessing({id: paymentId, action: 'paid'})
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/payments/${paymentId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Pagamento marcado como pago!')
        if (params.id) fetchPayments(params.id as string)
      } else {
        toast.error('Erro ao atualizar pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setActionProcessing(null)
    }
  }

  async function handleRevertPayment(paymentId: string) {
    setActionProcessing({id: paymentId, action: 'revert'})
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'revert' }),
      })

      if (res.ok) {
        toast.success('Pagamento revertido para pendente!')
        setActiveDropdown(null)
        if (params.id) fetchPayments(params.id as string)
      } else {
        toast.error('Erro ao reverter pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setActionProcessing(null)
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return

    setActionProcessing({id: paymentId, action: 'delete'})
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Pagamento excluir!')
        setActiveDropdown(null)
        if (params.id) fetchPayments(params.id as string)
      } else {
        toast.error('Erro ao excluir pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setActionProcessing(null)
    }
  }

  async function handleEditPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPayment || !editAmount || !editDueDate) {
      toast.error('Preencha todos os campos')
      return
    }

    setActionProcessing({id: editingPayment.id, action: 'edit'})
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/payments/${editingPayment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(editAmount),
          due_date: editDueDate,
        }),
      })

      if (res.ok) {
        toast.success('Pagamento atualizado!')
        setEditingPayment(null)
        setActiveDropdown(null)
        if (params.id) fetchPayments(params.id as string)
      } else {
        toast.error('Erro ao atualizar pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setActionProcessing(null)
    }
  }

  function openEditModal(payment: Payment) {
    setEditingPayment(payment)
    setEditAmount(payment.amount.toString())
    setEditDueDate(payment.due_date)
    setActiveDropdown(null)
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!newPayment.amount || !newPayment.dueDate) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id: params.id,
          amount: Number(newPayment.amount),
          due_date: newPayment.dueDate,
        }),
      })

      if (res.ok) {
        toast.success('Pagamento criado com sucesso!')
        setNewPayment({ amount: '', dueDate: '' })
        setShowPaymentForm(false)
        if (params.id) fetchPayments(params.id as string)
      } else {
        toast.error('Erro ao criar pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  function getMonthName(refMonth: string | null) {
    if (!refMonth) return ''
    const [year, month] = refMonth.split('-')
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ]
    return `${months[parseInt(month) - 1]}/${year}`
  }

  function getWhatsAppLink(payment: Payment) {
    const client = Array.isArray(service?.clients) ? service.clients[0] : service?.clients
    if (!client?.telefone) return null
    const phone = String(client.telefone).replace(/\D/g, '')
    const clientName = client.name
    const month = getMonthName(payment.reference_month)
    const amount = formatCurrency(payment.amount)
    const dueDate = formatDate(payment.due_date)
    const status = payment.status === 'late' ? 'atrasado' : 'pendente'
    const message = `Olá ${clientName}, seu pagamento referente a ${month} no valor de ${amount} está ${status}. Vencimento: ${dueDate}. Por favor, regularize sua situação.`
    const encodedMessage = encodeURIComponent(message)
    return `https://wa.me/${phone}?text=${encodedMessage}`
  }

  if (loading) return <Loading message="Carregando serviço..." />
  if (!service) return null

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              ← Voltar
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/services/${service.id}/edit`)}
                className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
              >
                Editar
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
            <p className="text-sm text-gray-600 mt-1">{service.clients?.name}</p>
            <div className="flex space-x-4 mt-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {service.type === 'recurring' ? 'Recorrente' : 'Único'}
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {formatCurrency(service.price)}
              </span>
              {service.recurrence && (
                <span className="text-xs text-gray-500">
                  {service.recurrence === 'monthly' ? 'Mensal' : 'Anual'}
                </span>
              )}
            </div>
          </div>

          {dashboard && (
            <>
              {dashboard.urgentAlert && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">🚨</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        COBRAR AGORA
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        Este cliente possui {dashboard.pendingCount} pagamentos pendentes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Pago</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(dashboard.totalPaid)}
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Pendente</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(dashboard.totalPending)}
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total do Contrato</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(dashboard.totalContract)}
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm text-gray-500">Pagos / Pendentes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dashboard.paidCount} / {dashboard.pendingCount}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Pagamentos</h2>
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
              >
                {showPaymentForm ? 'Cancelar' : 'Novo Pagamento'}
              </button>
            </div>

            {showPaymentForm && (
              <form onSubmit={handleCreatePayment} className="mb-6 p-4 bg-gray-50 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={
                        newPayment.amount
                          ? formatCurrency(Number(newPayment.amount))
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '')
                        const number = Number(raw) / 100
                        setNewPayment({
                          ...newPayment,
                          amount: isNaN(number) ? '' : number.toString(),
                        })
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Data de Vencimento
                    </label>
                    <input
                      type="date"
                      required
                      value={newPayment.dueDate}
                      onChange={(e) =>
                        setNewPayment({ ...newPayment, dueDate: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-3 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Criar Pagamento
                </button>
              </form>
            )}

            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nenhum pagamento encontrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Mês Referência
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Vencimento
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Valor
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getMonthName(payment.reference_month)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'late'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {payment.status === 'paid'
                              ? 'Pago'
                              : payment.status === 'late'
                              ? 'Atrasado'
                              : 'Pendente'}
                          </span>
                          {payment.paid_at && (
                             <p className="text-xs text-gray-500 mt-1">
                               Pago em {formatDateTime(payment.paid_at)}
                             </p>
                           )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {payment.status !== 'paid' && (
                              <button
                                onClick={() => handleMarkAsPaid(payment.id)}
                                disabled={actionProcessing?.id === payment.id}
                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {actionProcessing?.id === payment.id && actionProcessing?.action === 'paid' ? 'Processando...' : 'Marcar como Pago'}
                              </button>
                            )}
                            {getWhatsAppLink(payment) && (
                              <a
                                href={getWhatsAppLink(payment)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600 inline-block"
                              >
                                WhatsApp
                              </a>
                            )}
                            <div className="relative" data-dropdown="true">
                              <button
                                onClick={() =>
                                  setActiveDropdown(activeDropdown === payment.id ? null : payment.id)
                                }
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 font-bold"
                              >
                                ⋮
                              </button>
                              {activeDropdown === payment.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                  <button
                                    onClick={() => openEditModal(payment)}
                                    disabled={actionProcessing?.id === payment.id}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    {actionProcessing?.id === payment.id && actionProcessing?.action === 'edit' ? 'Carregando...' : 'Editar'}
                                  </button>
                                  {payment.status === 'paid' && (
                                    <button
                                      onClick={() => handleRevertPayment(payment.id)}
                                      disabled={actionProcessing?.id === payment.id}
                                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                      {actionProcessing?.id === payment.id && actionProcessing?.action === 'revert' ? 'Carregando...' : 'Reverter para não pago'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    disabled={actionProcessing?.id === payment.id}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {actionProcessing?.id === payment.id && actionProcessing?.action === 'delete' ? 'Carregando...' : 'Excluir'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  
    {editingPayment && (
      <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Pagamento</h3>
          <form onSubmit={handleEditPayment}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={editAmount ? formatCurrency(Number(editAmount)) : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '')
                  const number = Number(raw) / 100
                  setEditAmount(isNaN(number) ? '' : number.toString())
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                placeholder="0,00"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
              <input
                type="date"
                required
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={actionProcessing?.id === editingPayment.id}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionProcessing?.id === editingPayment.id ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                disabled={actionProcessing?.id === editingPayment.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
