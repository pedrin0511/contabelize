'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import Loading from '@/components/Loading'

interface Client {
  id: string
  name: string
  document: string | null
  due_day: number | null
  created_at: string
}

interface Service {
  id: string
  name: string
  type: string
  price: number
  recurrence: string | null
  start_date: string
  end_date: string | null
  created_at: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true)

  async function fetchClient(id: string) {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        toast.error('Cliente não encontrado')
        router.push('/clients')
        return
      }

      const data = await res.json()
      setClient(data.client)
    } catch {
      toast.error('Erro ao carregar cliente')
    } finally {
      setLoading(false)
    }
  }

  async function fetchServices(clientId: string) {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/services?client_id=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch {
      toast.error('Erro ao carregar serviços')
    } finally {
      setLoadingServices(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchClient(params.id as string)
      fetchServices(params.id as string)
    }
  }, [params.id])

  if (loading) return <Loading message="Carregando cliente..." />
  if (!client) return null

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

          <div className="max-w-md mx-auto bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/clients/${client.id}/edit`)}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                >
                  Editar
                </button>
              </div>
            </div>

            <dl className="space-y-4">
              {client.document && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Documento</dt>
                  <dd className="mt-1 text-sm text-gray-900">{client.document}</dd>
                </div>
              )}
              {client.due_day && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Dia de Vencimento</dt>
                  <dd className="mt-1 text-sm text-gray-900">Dia {client.due_day}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Cadastrado em</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Serviços</h2>
              <button
                onClick={() => router.push(`/services/new?client_id=${client.id}`)}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Novo Serviço
              </button>
            </div>

            {loadingServices ? (
              <Loading message="Carregando serviços..." />
            ) : services.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum serviço encontrado.</p>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {services.map((service) => (
                    <li key={service.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => router.push(`/services/${service.id}`)}
                              className="text-sm font-medium text-indigo-600 truncate hover:text-indigo-500"
                            >
                              {service.name}
                            </button>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                service.type === 'recurring'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {service.type === 'recurring' ? 'Recorrente' : 'Único'}
                              </span>
                              {service.recurrence && (
                                <span className="text-xs text-gray-500">
                                  {service.recurrence === 'monthly' ? 'Mensal' : 'Anual'}
                                </span>
                              )}
                              <span className="text-sm text-gray-900 font-medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(service.price)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Início: {new Date(service.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              {service.end_date && (
                                <span> • Término: {new Date(service.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => router.push(`/services/${service.id}/edit`)}
                              className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
