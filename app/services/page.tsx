'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  clients: { id: string; name: string }
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch('/api/services', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        router.push('/login')
        return
      }

      const data = await res.json()
      setServices(data.services || [])
    } catch {
      toast.error('Erro ao carregar serviços')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return

    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Serviço excluído com sucesso!')
        fetchServices()
      } else {
        toast.error('Erro ao excluir serviço')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  if (loading) return <Loading message="Carregando serviços..." />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
            <button
              onClick={() => router.push('/services/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Novo Serviço
            </button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum serviço cadastrado</p>
            </div>
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
                          <p className="text-sm text-gray-500">
                            {service.clients?.name || 'Cliente não encontrado'}
                          </p>
                          <div className="flex space-x-2 mt-1">
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
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/services/${service.id}/edit`)}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                          >
                            Excluir
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
  )
}
