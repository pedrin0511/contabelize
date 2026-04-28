'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthlyData {
  month: string
  received: number
  pending: number
}

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function formatMonth(month: string) {
  const index = parseInt(month.split('-')[1], 10) - 1
  return MONTH_LABELS[index] || month
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null

  return (
    <div className="apple-card p-4 shadow-lg">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
              <span className="font-semibold" style={{ color: entry.color }}>
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
    </div>
  )
}

export default function RevenueChart({ data }: { data: MonthlyData[] }) {
  const chartData = data.map(item => ({
    ...item,
    month: formatMonth(item.month),
  }))

  return (
    <div className="apple-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h2 className="section-title text-gray-900 dark:text-white">
            Faturamento Mensal
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comparativo de recebido vs pendente
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#86868b', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#86868b', fontSize: 12 }}
            tickFormatter={value => formatCurrency(value).replace(/\u00A0/g, ' ')}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>}
          />
          <Bar
            dataKey="received"
            name="Recebido"
            fill="#0071e3"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="pending"
            name="Pendente"
            fill="#aeaeb2"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
