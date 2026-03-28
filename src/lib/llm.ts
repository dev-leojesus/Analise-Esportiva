const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'minimax/MiniMax-M2.5-Free'

export interface Match {
  id: string
  home_team: string
  away_team: string
  league: string
  country: string
  date: string
  time: string
  datetime: string
  venue: string
  status: string
  hours_until: number
  countdown: string
}

export interface Analysis {
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
  factors: string[]
  prediction: string
}

function getCurrentDateTime(): string {
  const now = new Date()
  const brasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  return brasilia.toISOString().slice(0, 16).replace('T', ' ')
}

function formatCountdown(hours: number): string {
  if (hours < 1) return `${Math.floor(hours * 60)}min`
  if (hours < 24) return `${hours}h`
  return `${hours}h`
}

export function getFallbackMatches(): Match[] {
  const now = new Date()
  const brasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dateStr = brasilia.toISOString().split('T')[0]
  
  return [
    { id: '1', home_team: 'Portugal', away_team: 'Polônia', league: 'Eliminatórias Copa do Mundo', country: 'Portugal', date: dateStr, time: '15:45', datetime: `${dateStr}T15:45:00-03:00`, venue: 'Estádio da Luz, Lisboa', status: 'scheduled', hours_until: 0, countdown: '53min' },
    { id: '2', home_team: 'PSG', away_team: 'Marseille', league: 'Ligue 1', country: 'França', date: dateStr, time: '16:00', datetime: `${dateStr}T16:00:00-03:00`, venue: 'Parc des Princes, Paris', status: 'scheduled', hours_until: 1, countdown: '1h' },
    { id: '3', home_team: 'Real Madrid', away_team: 'Barcelona', league: 'La Liga', country: 'Espanha', date: dateStr, time: '17:00', datetime: `${dateStr}T17:00:00-03:00`, venue: 'Santiago Bernabéu, Madri', status: 'scheduled', hours_until: 2, countdown: '2h' },
    { id: '4', home_team: 'Estados Unidos', away_team: 'Bélgica', league: 'Amistoso Internacional', country: 'EUA', date: dateStr, time: '17:30', datetime: `${dateStr}T17:30:00-03:00`, venue: 'Mercedes-Benz Stadium, Atlanta', status: 'scheduled', hours_until: 2, countdown: '2h' },
    { id: '5', home_team: 'Brasil', away_team: 'Colômbia', league: 'Eliminatórias Copa do Mundo', country: 'Brasil', date: dateStr, time: '21:30', datetime: `${dateStr}T21:30:00-03:00`, venue: 'Maracanã, Rio de Janeiro', status: 'scheduled', hours_until: 6, countdown: '6h' },
    { id: '6', home_team: 'Flamengo', away_team: 'Palmeiras', league: 'Brasileirão Série A', country: 'Brasil', date: dateStr, time: '21:30', datetime: `${dateStr}T21:30:00-03:00`, venue: 'Maracanã, Rio de Janeiro', status: 'scheduled', hours_until: 6, countdown: '6h' },
  ]
}

export async function searchMatchesWithLLM(): Promise<Match[]> {
  const now = new Date()
  const brasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dateStr = brasilia.toISOString().split('T')[0]
  const timeStr = brasilia.toTimeString().slice(0, 5)
  
  const systemPrompt = `Você é um assistente especializado em futebol. Forneça informações sobre jogos de futebol. Retorne APENAS JSON válido.`
  
  const userPrompt = `Liste todos os jogos de futebol que acontecerão nas próximas 24 horas a partir de agora (${dateStr} ${timeStr} - horário de Brasília).
Inclua: eliminatórias, ligas nacionais, amistosos, etc.
Para cada jogo: home_team, away_team, league, country, date (YYYY-MM-DD), time (HH:MM), venue, status.
Retorne APENAS o JSON array, sem texto adicional.`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.error('LLM API error:', response.status)
      return getFallbackMatches()
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    
    let jsonStr = content.trim()
    jsonStr = jsonStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim()
    
    const matches = JSON.parse(jsonStr)
    
    return matches.map((m: any, i: number) => ({
      id: m.id || String(i + 1),
      home_team: m.home_team,
      away_team: m.away_team,
      league: m.league,
      country: m.country,
      date: m.date || dateStr,
      time: m.time || '00:00',
      datetime: m.datetime || `${m.date || dateStr}T${m.time || '00:00'}:00-03:00`,
      venue: m.venue || '',
      status: 'scheduled',
      hours_until: Math.floor(Math.random() * 12) + 1,
      countdown: formatCountdown(Math.floor(Math.random() * 12) + 1),
    }))
  } catch (error) {
    console.error('LLM Error:', error)
    return getFallbackMatches()
  }
}

export async function analyzeMatch(match: Match): Promise<Analysis> {
  const systemPrompt = `Você é um especialista em análise de futebol.`
  
  const userPrompt = `Analise o jogo ${match.home_team} vs ${match.away_team}
Data: ${match.date} às ${match.time}
Liga: ${match.league}
Local: ${match.venue}

Forneça: home_win_prob (%), draw_prob (%), away_win_prob (%), factors (array), prediction
Retorne APENAS JSON.`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      return getFallbackAnalysis()
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    let jsonStr = content.trim()
    jsonStr = jsonStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim()
    
    return JSON.parse(jsonStr)
  } catch {
    return getFallbackAnalysis()
  }
}

function getFallbackAnalysis(): Analysis {
  return {
    home_win_prob: 45,
    draw_prob: 25,
    away_win_prob: 30,
    factors: ['Análise indisponível'],
    prediction: 'Empate'
  }
}
