'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import StatsCards from './StatsCards'
import RevenueChart from './RevenueChart'

interface DashboardData {
  total_received: number
  total_pending: number
  total_overdue_amount: number
  total_payments: number
  total: number
  total_services: number
  total_clients: number
  monthly_revenue: Array<{
    month: string
    received: number
    pending: number
  }>
}

export const DashBoard = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const token = document.cookie.replace(
        /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
        '$1'
      )

      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        toast.error('Erro ao carregar dashboard')
        return
      }

      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="apple-card p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Não foi possível carregar os dados do dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <StatsCards
        totalReceived={data.total_received}
        totalPending={data.total_pending}
        totalOverdue={data.total_overdue_amount}
        totalPayments={data.total_payments}
        totalServices={data.total_services}
        totalClients={data.total_clients}
        year={new Date().getFullYear()}
      />
      <RevenueChart data={data.monthly_revenue} />
    </div>
  )
}
