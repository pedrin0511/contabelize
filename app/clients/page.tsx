'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        router.push('/login')
        return
      }

      const data = await res.json()
      setClients(data.clients || [])
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Cliente excluído com sucesso!')
        fetchClients()
      } else {
        toast.error('Erro ao excluir cliente')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  if (loading) return <Loading message="Carregando clientes..." />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <button
              onClick={() => router.push('/clients/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Novo Cliente
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum cliente cadastrado</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <li key={client.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="text-sm font-medium text-indigo-600 truncate hover:text-indigo-500"
                          >
                            {client.name}
                          </button>
                          {client.document && (
                            <p className="text-sm text-gray-500">{client.document}</p>
                          )}
                          {client.due_day && (
                            <p className="text-xs text-gray-400">
                              Vencimento: dia {client.due_day}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/clients/${client.id}/edit`)}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
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
