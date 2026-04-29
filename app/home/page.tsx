'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Loading from '@/components/Loading'
import { DashBoard } from './components/dashboard'
import { fetchWithRefresh } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()
  const [office, setOffice] = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithRefresh('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          router.push('/login')
          return
        }
        return res.json()
      })
      .then(data => {
        if (data?.office) {
          setOffice(data.office)
        }
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  if (loading) return <Loading message="Carregando..." />
  if (!office) return null

  const currentHour = new Date().getHours()
  let greeting = 'Bom dia'
  if (currentHour >= 12 && currentHour < 18) greeting = 'Boa tarde'
  else if (currentHour >= 18) greeting = 'Boa noite'

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8 md:mb-12">
          <h1 className="page-title text-gray-900 dark:text-white">
            {greeting}, {office.name.split(' ')[0]}!
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Aqui está o resumo do seu consultório hoje.
          </p>
        </div>
        <DashBoard />
      </main>
    </div>
  )
}
