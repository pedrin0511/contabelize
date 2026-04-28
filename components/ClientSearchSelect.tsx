'use client'

import { useState, useEffect, useRef } from 'react'

interface Client {
  id: string
  name: string
}

interface ClientSearchSelectProps {
  value: string
  onChange: (clientId: string) => void
  error?: string
}

export default function ClientSearchSelect({ value, onChange, error }: ClientSearchSelectProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedClient = clients.find(c => c.id === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchClients(search)
    }
  }, [isOpen, search])

  useEffect(() => {
    if (value && !selectedClient) {
      fetchClients('')
    }
  }, [value])

  async function fetchClients(query: string) {
    setLoading(true)
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
        let filtered = data.clients || []
        if (query) {
          filtered = filtered.filter((c: Client) =>
            c.name.toLowerCase().includes(query.toLowerCase())
          )
        }
        setClients(filtered)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(client: Client) {
    onChange(client.id)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white cursor-pointer ${
          error ? 'border-red-300' : 'border-gray-300'
        } text-gray-900 text-sm min-h-[38px] flex items-center`}
      >
        {selectedClient ? (
          <span>{selectedClient.name}</span>
        ) : (
          <span className="text-gray-400">Selecione um cliente...</span>
        )}
        <span className="absolute right-3 top-1/2 -translate-y-1/2">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Carregando...</div>
          ) : clients.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">Nenhum cliente encontrado</div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleSelect(client)}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                  client.id === value ? 'bg-indigo-100' : ''
                }`}
              >
                {client.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
