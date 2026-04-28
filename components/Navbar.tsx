'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function Navbar() {
  const router = useRouter()

  function handleLogout() {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).then(() => {
      toast.success('Logout realizado com sucesso!')
      router.push('/login')
    })
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => router.push('/home')}
              className="text-xl font-bold text-gray-900 dark:text-white tracking-tight hover:opacity-70 transition-opacity"
            >
              Valdene
            </button>
            <div className="hidden sm:flex sm:space-x-1">
              <button
                onClick={() => router.push('/clients')}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Clientes
              </button>
              <button
                onClick={() => router.push('/services')}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Serviços
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-full transition-all hover:shadow-lg hover:shadow-blue-500/25"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
