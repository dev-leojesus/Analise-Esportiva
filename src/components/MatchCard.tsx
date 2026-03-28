'use client'

import { useState } from 'react'
import { Match } from '@/lib/llm'
import { ChevronDown, ChevronUp, MapPin, Timer } from 'lucide-react'

interface MatchCardProps {
  match: Match
}

export function MatchCard({ match }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{match.league}</span>
        </div>
        {match.countdown && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
            <Timer className="w-3 h-3" />
            <span>{match.countdown}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center flex-1">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {match.home_team.charAt(0)}
            </span>
          </div>
          <span className="font-medium text-sm text-center">{match.home_team}</span>
        </div>

        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg mx-2 flex flex-col items-center">
          <span className="text-xs text-gray-500">VS</span>
          <span className="font-bold text-lg">{match.time}</span>
        </div>

        <div className="flex flex-col items-center flex-1">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
            <span className="text-xl font-bold text-red-600 dark:text-red-400">
              {match.away_team.charAt(0)}
            </span>
          </div>
          <span className="font-medium text-sm text-center">{match.away_team}</span>
        </div>
      </div>

      {expanded && match.venue && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            📍 {match.venue}
          </p>
        </div>
      )}

      <div className="flex justify-center mt-3">
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  )
}
