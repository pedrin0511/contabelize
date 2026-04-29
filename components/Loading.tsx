export default function Loading({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-4 text-sm text-foreground/70">{message}</p>
      </div>
    </div>
  )
}
