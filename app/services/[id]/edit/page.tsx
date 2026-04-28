'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import Loading from '@/components/Loading'
import ClientSearchSelect from '@/components/ClientSearchSelect'

interface Service {
  id: string
  client_id: string
  name: string
  type: string
  price: number
  recurrence: string | null
  start_date: string
  end_date: string | null
}

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (params.id) fetchService(params.id as string)
  }, [params.id])

  async function fetchService(id: string) {
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
      const svc = data.service
      setService(svc)
      setName(svc.name || '')
      setClientId(svc.client_id || '')
    } catch {
      toast.error('Erro ao carregar serviço')
    } finally {
      setFetching(false)
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!clientId) newErrors.clientId = 'Selecione um cliente'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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

      const body: Record<string, string> = {
        name: name.trim(),
        client_id: clientId,
      }

      const res = await fetch(`/api/services/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao atualizar serviço')
        setLoading(false)
        return
      }

      toast.success('Serviço atualizado com sucesso!')
      router.push(`/services/${params.id}`)
    } catch {
      toast.error('Erro ao conectar com o servidor')
      setLoading(false)
    }
  }

  if (fetching) return <Loading message="Carregando serviço..." />
  if (!service) return null

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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Serviço</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

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

              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Tipo:</strong> {service.type === 'recurring' ? 'Recorrente' : 'Único'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Preço:</strong> R$ {service.price?.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Data de Início:</strong> {new Date(service.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
                {service.end_date && (
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Data de Término:</strong> {new Date(service.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Apenas o nome e o cliente podem ser alterados.
                </p>
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
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
