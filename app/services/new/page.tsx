import { Suspense } from 'react'
import NewServiceForm from './NewServiceForm'
import Loading from '@/components/Loading'

export default function NewServicePage() {
  return (
    <Suspense fallback={<Loading message="Carregando..." />}>
      <NewServiceForm />
    </Suspense>
  )
}
