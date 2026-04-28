import { formatCurrency } from '@/lib/utils'

interface StatsCardsProps {
  totalReceived: number
  totalPending: number
  totalOverdue: number
  totalPayments: number
  totalServices: number
  totalClients: number
  year?: number
}

export default function StatsCards({
  totalReceived,
  totalPending,
  totalOverdue,
  totalPayments,
  totalServices,
  totalClients,
  year,
}: StatsCardsProps) {
  const currentYear = year || new Date().getFullYear()

  const cards = [
    {
      title: `Total Recebido`,
      subtitle: `Em ${currentYear}`,
      value: formatCurrency(totalReceived),
      gradient: 'from-emerald-400 to-green-500',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
    },
    {
      title: `A Receber`,
      subtitle: `Em ${currentYear}`,
      value: formatCurrency(totalPending),
      gradient: 'from-amber-400 to-yellow-500',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
    },
    {
      title: `Em Atraso`,
      subtitle: `Em ${currentYear}`,
      value: formatCurrency(totalOverdue),
      gradient: 'from-rose-400 to-red-500',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
    },
    {
      title: `Pagamentos`,
      subtitle: `Total registrados`,
      value: totalPayments,
      gradient: 'from-blue-400 to-indigo-500',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
    },
    {
      title: `Serviços`,
      subtitle: `Total ativos`,
      value: totalServices,
      gradient: 'from-violet-400 to-purple-500',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
    },
    {
      title: `Clientes`,
      subtitle: `Total cadastrados`,
      value: totalClients,
      gradient: 'from-cyan-400 to-blue-500',
      textColor: 'text-white',
      iconBg: 'bg-white/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`apple-card bg-gradient-to-br ${card.gradient} p-5 sm:p-6 relative overflow-hidden`}
        >
          <div className="relative z-10">
            <p className={`text-sm font-medium ${card.textColor} opacity-90`}>
              {card.title}
            </p>
            <p className={`text-xs ${card.textColor} opacity-70 mb-3`}>
              {card.subtitle}
            </p>
            <p className={`stat-value ${card.textColor}`}>{card.value}</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  )
}
