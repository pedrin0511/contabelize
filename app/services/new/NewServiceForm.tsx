'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import ClientSearchSelect from '@/components/ClientSearchSelect'
import { formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  name: string
}

export default function NewServiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'recurring' | 'one_time'>('recurring')
  const [price, setPrice] = useState('')
  const [recurrence, setRecurrence] = useState<'monthly' | 'yearly'>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [installments, setInstallments] = useState('')

  useEffect(() => {
    fetchClients()
    const clientIdFromUrl = searchParams.get('client_id')
    if (clientIdFromUrl) {
      setClientId(clientIdFromUrl)
    }
  }, [searchParams])

  async function fetchClients() {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch {
      toast.error('Erro ao carregar clientes')
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!clientId) newErrors.clientId = 'Selecione um cliente'
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      newErrors.price = 'Valor deve ser um valor válido maior que zero'
    }
    if (!startDate) newErrors.startDate = 'Data de início é obrigatória'
    if (type === 'recurring' && installments && (isNaN(Number(installments)) || Number(installments) <= 0)) {
      newErrors.installments = 'Quantidade de parcelas deve ser um número válido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const number = Number(raw) / 100
    if (!isNaN(number) && number > 0) {
      setPrice(number.toString())
    } else {
      setPrice('')
    }
    setErrors((prev) => ({ ...prev, price: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const body: Record<string, string | number> = {
        client_id: clientId,
        name: name.trim(),
        type,
        price: Number(price),
        start_date: startDate,
      }

      if (type === 'recurring') {
        body.recurrence = recurrence
      }

      if (installments) {
        body.installments = Number(installments)
      } else if (endDate) {
        body.end_date = endDate
      }

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao cadastrar serviço')
        setLoading(false)
        return
      }

      toast.success('Serviço cadastrado com sucesso!')
      router.push('/services')
    } catch {
      toast.error('Erro ao conectar com o servidor')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              ← Voltar
            </button>
          </div>

          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Serviço</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cliente *
                </label>
                <ClientSearchSelect
                  value={clientId}
                  onChange={setClientId}
                  error={errors.clientId}
                />
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>
                )}
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome do Serviço *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors((prev) => ({ ...prev, name: '' }))
                  }}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Contabilidade Mensal"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo *</label>
                <div className="mt-1 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      checked={type === 'recurring'}
                      onChange={() => setType('recurring')}
                      className="form-radio text-indigo-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Recorrente</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      checked={type === 'one_time'}
                      onChange={() => setType('one_time')}
                      className="form-radio text-indigo-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Único</span>
                  </label>
                </div>
              </div>

              {type === 'recurring' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recorrência</label>
                  <div className="mt-1 space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="recurrence"
                        checked={recurrence === 'monthly'}
                        onChange={() => setRecurrence('monthly')}
                        className="form-radio text-indigo-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Mensal</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="recurrence"
                        checked={recurrence === 'yearly'}
                        onChange={() => setRecurrence('yearly')}
                        className="form-radio text-indigo-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Anual</span>
                    </label>
                  </div>
                </div>
              )}

              {type === 'recurring' && (
                <div>
                  <label htmlFor="installments" className="block text-sm font-medium text-gray-700">
                    Quantidade de Parcelas (opcional)
                  </label>
                  <input
                    id="installments"
                    type="number"
                    min="1"
                    value={installments}
                    onChange={(e) => {
                      setInstallments(e.target.value)
                      setErrors((prev) => ({ ...prev, installments: '' }))
                    }}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400 ${
                      errors.installments ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Ex: 12 (deixa em branco para usar data de término)"
                  />
                  {errors.installments && (
                    <p className="mt-1 text-sm text-red-600">{errors.installments}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Se preenchido, gerará a quantidade exata de pagamentos. Caso contrário, usará a data de término.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Valor da Parcela (R$) *
                </label>
                 <input
                   id="price"
                   type="text"
                   inputMode="decimal"
                   required
                   value={price ? formatCurrency(Number(price)) : ''}
                   onChange={handlePriceChange}
                  placeholder="0,00"
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400 ${
                    errors.price ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {type === 'recurring' ? 'Valor de cada parcela mensal/anual' : 'Valor total do serviço único'}
                </p>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Data de Início *
                </label>
                <input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setErrors((prev) => ({ ...prev, startDate: '' }))
                  }}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  Data de Término (opcional)
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
