import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Football Analyzer',
  description: 'Análise pré-live de partidas de futebol',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 dark:bg-gray-900">{children}</body>
    </html>
  )
}
