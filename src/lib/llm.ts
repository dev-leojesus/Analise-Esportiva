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

function getBrasiliaDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}

function calculateHoursUntil(dateStr: string, timeStr: string): number {
  try {
    const brasilia = getBrasiliaDate()
    const matchDate = new Date(`${dateStr}T${timeStr}:00-03:00`)
    const diff = matchDate.getTime() - brasilia.getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60)))
  } catch {
    return 0
  }
}

function formatCountdown(hours: number): string {
  if (hours <= 0) return 'Agora'
  if (hours < 1) return `${Math.floor(hours * 60)}min`
  if (hours < 24) return `${hours}h`
  return `${hours}h`
}

export async function searchMatchesWithLLM(): Promise<Match[]> {
  const brasilia = getBrasiliaDate()
  const dateStr = brasilia.toISOString().split('T')[0]
  const timeStr = brasilia.toTimeString().slice(0, 5)
  const tomorrow = new Date(brasilia)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  const systemPrompt = `Você é um assistente esportivo que NUNCA inventa informações. Se não souber algo, diga que não sabe.`
  
  const userPrompt = `IMPORTANTE: HOJE É ${dateStr} ÀS ${timeStr} (HORÁRIO DE BRASÍLIA).

Liste APENAS jogos de futebol CONFIRMADOS que ACONTECERÃO entre agora e ${tomorrowStr} 23:59 (próximas 24 horas).

REGRAS OBRIGATÓRIAS:
1. NUNCA invente jogos - use apenas jogos reais e confirmados
2. Se não tiver certeza de um jogo, NÃO o inclua
3. Verifique os horários合理性 (ex: jogos brasileiros usually 16h-22h, europeu 11h-17h Brasília)
4. Inclua APENAS jogos com horário confirmado

COMPETIÇÕES VÁLIDAS:
- Eliminatórias Copa do Mundo 2026 (sul-americana, europeia, etc)
- Brasileirão Série A
- Premier League, La Liga, Bundesliga, Ligue 1, Serie A
- Copa do Brasil
- Champions League, Europa League
- Amistosos de Seleções (se confirmados)

Para CADA jogo real, forneça:
{
  "home_team": "nome completo do time mandante",
  "away_team": "nome completo do time visitante", 
  "league": "competição oficial",
  "country": "país da competição",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (horário de Brasília)",
  "venue": "estádio, cidade"
}

Retorne APENAS JSON array. Se não houver jogos reais, retorne [].`

  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return getFallbackMatches()
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://football-analyzer.vercel.app',
        'X-Title': 'Football Analyzer',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.0,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      console.error('LLM API error:', response.status)
      return getFallbackMatches()
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    
    let jsonStr = content.trim()
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    
    const matches = JSON.parse(jsonStr)
    
    if (!Array.isArray(matches) || matches.length === 0) {
      console.log('LLM retornou array vazio')
      return getFallbackMatches()
    }
    
    const processedMatches = matches.map((m: any, i: number) => {
      const hoursUntil = calculateHoursUntil(m.date || dateStr, m.time || '00:00')
      return {
        id: m.id || String(i + 1),
        home_team: m.home_team || 'Time A',
        away_team: m.away_team || 'Time B',
        league: m.league || 'Desconhecido',
        country: m.country || 'Desconhecido',
        date: m.date || dateStr,
        time: m.time || '00:00',
        datetime: `${m.date || dateStr}T${m.time || '00:00'}:00-03:00`,
        venue: m.venue || '',
        status: 'scheduled',
        hours_until: hoursUntil,
        countdown: formatCountdown(hoursUntil),
      }
    }).filter((m: Match) => m.hours_until >= 0 && m.hours_until <= 24)
    
    processedMatches.sort((a: Match, b: Match) => a.hours_until - b.hours_until)
    
    console.log(`LLM retornou ${processedMatches.length} jogos`)
    return processedMatches
    
  } catch (error) {
    console.error('LLM Error:', error)
    return getFallbackMatches()
  }
}

export async function analyzeMatch(match: Match): Promise<Analysis> {
  return getFallbackAnalysis()
}

function getFallbackMatches(): Match[] {
  const brasilia = getBrasiliaDate()
  const dateStr = brasilia.toISOString().split('T')[0]
  
  return [
    { id: '1', home_team: 'A definir', away_team: 'A definir', league: 'Carregando dados...', country: '-', date: dateStr, time: '--:--', datetime: `${dateStr}T00:00:00-03:00`, venue: 'Aguarde', status: 'scheduled', hours_until: 0, countdown: 'Aguarde' },
  ]
}

function getFallbackAnalysis(): Analysis {
  return {
    home_win_prob: 0,
    draw_prob: 0,
    away_win_prob: 0,
    factors: ['Aguardando dados do LLM'],
    prediction: '-'
  }
}
