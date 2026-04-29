'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import { cleanPhone, FormatarNumero } from '@/utils/formatarNumero'

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,4})$/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function validateDocument(doc: string): boolean {
  const digits = doc.replace(/\D/g, '')
  return digits.length === 11 || digits.length === 14
}

export default function NewClientPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [telefone, setTelefone] = useState('')
  const [clientDocument, setClientDocument] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskDocument(e.target.value)
    if (masked.length <= 18) setClientDocument(masked)
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Nome é obrigatório'
    if (clientDocument.trim() && !validateDocument(clientDocument)) {
      newErrors.document = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'
    }
    if (dueDay && (Number(dueDay) < 1 || Number(dueDay) > 31)) {
      newErrors.dueDay = 'Dia deve estar entre 1 e 31'
    }

    if (!telefone.trim() && telefone.length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos'
    }
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

      const body: Record<string, string | number> = { name: name.trim() }
      if (clientDocument.trim()) body.document = clientDocument.trim()
      if (dueDay) body.due_day = Number(dueDay)
      if (telefone.trim()) body.telefone = telefone.trim()

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao cadastrar cliente')
        setLoading(false)
        return
      }

      toast.success('Cliente cadastrado com sucesso!')
      router.push('/clients')
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Cliente</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome *
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
                  placeholder="Nome do cliente"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="document" className="block text-sm font-medium text-gray-700">
                  Documento (CPF/CNPJ)
                </label>
                <input
                  id="document"
                  type="text"
                  value={clientDocument}
                  onChange={handleDocumentChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400 ${
                    errors.document ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
                {errors.document && (
                  <p className="mt-1 text-sm text-red-600">{errors.document}</p>
                )}
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                  Telefone *
                </label>
                <input
                  id="telefone"
                  type="text"
                  required
                  value={FormatarNumero(telefone)}
                  onChange={(e) => {
                    setTelefone(cleanPhone(e.target.value))
                    setErrors((prev) => ({ ...prev, telefone: '' }))
                  }}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400 ${
                    errors.telefone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Telefone do cliente"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                )}
              </div>

              <div>
                <label htmlFor="dueDay" className="block text-sm font-medium text-gray-700">
                  Dia de Vencimento (1-31)
                </label>
                <input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => {
                    setDueDay(e.target.value)
                    setErrors((prev) => ({ ...prev, dueDay: '' }))
                  }}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400 ${
                    errors.dueDay ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: 10"
                />
                {errors.dueDay && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDay}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
