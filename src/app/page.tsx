'use client'

import { useState, useEffect, useCallback } from 'react'
import { MatchCard } from '@/components/MatchCard'
import { searchMatchesWithLLM, Match } from '@/lib/llm'
import { RefreshCw, Clock, Search } from 'lucide-react'

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchMatches = useCallback(async () => {
    try {
      setError(null)
      const data = await searchMatchesWithLLM()
      setMatches(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error:', err)
      setError('Falha ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatches()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchMatches])

  const countries = ['', 'Brasil', 'Portugal', 'Espanha', 'Inglaterra', 'França', 'Alemanha']

  const filteredMatches = selectedCountry
    ? matches.filter(m => m.country.toLowerCase().includes(selectedCountry.toLowerCase()) || m.league.toLowerCase().includes(selectedCountry.toLowerCase()))
    : matches

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Football Analyzer
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}</span>
              </div>
              <button
                onClick={fetchMatches}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Próximos Jogos
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {countries.map((country) => (
              <button
                key={country || 'all'}
                onClick={() => setSelectedCountry(country)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCountry === country
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100'
                }`}
              >
                {country || 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading && matches.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}

        {!loading && filteredMatches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum jogo encontrado.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
