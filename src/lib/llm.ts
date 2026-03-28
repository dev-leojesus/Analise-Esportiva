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
  
  const systemPrompt = `Você é um assistente esportivo especializado em futebol. Seu trabalho é fornecer informações verdadeiras e atualizadas sobre jogos de futebol.`
  
  const userPrompt = `Hoje é ${dateStr} às ${timeStr} (horário de Brasília).

Liste TODOS os jogos de futebol que ACONTECERÃO nas próximas 24 horas (até ${dateStr} 23:59).
Inclua APENAS jogos confirmados e reais como:
- Eliminatórias Copa do Mundo 2026
- Campeonatos nacionais (Brasileirão, Premier League, La Liga, Bundesliga, Ligue 1, Serie A)
- Copas nacionais (Copa do Brasil, FA Cup, Copa del Rey)
- Amistosos internacionais
- Champions League, Europa League

Para CADA jogo, retorne:
{
  "home_team": "nome do time mandante",
  "away_team": "nome do time visitante", 
  "league": "nome da competição",
  "country": "país onde a competição ocorre",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (horário de Brasília)",
  "venue": "estádio e cidade"
}

CRÍTICO: 
- Use APENAS números reales de jogos. NÃO invente jogos.
- Se não houver jogos em uma competição, não a mencione.
- Verifique os horários sejam realistas para o fuso de Brasília.
- Ordene por horário (mais cedo primeiro)

Retorne APENAS um JSON array válido, sem texto algum.`

  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    console.log('API key não configurada - usando fallback')
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
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LLM API error:', response.status, errorText)
      return getFallbackMatches()
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    
    let jsonStr = content.trim()
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    
    const matches = JSON.parse(jsonStr)
    
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
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return getFallbackAnalysis()
  }

  const systemPrompt = `Você é um especialista em análise de futebol com profundo conhecimento de estatísticas, táticas e histórico de equipes.`
  
  const userPrompt = `Analise tecnicamente o seguinte jogo:

${match.home_team} vs ${match.away_team}
${match.date} às ${match.time}
${match.league}
Local: ${match.venue}

Considere:
- Forma recente das equipes
- Confrentos diretos históricos
- Desfalques importantes
- Estatísticas ofensivas/defensivas
- Fator casa

Forneça análise com:
{
  "home_win_prob": número (0-100),
  "draw_prob": número (0-100), 
  "away_win_prob": número (0-100),
  "factors": ["fator 1", "fator 2", "fator 3"],
  "prediction": "qual resultado você acredita mais provável"
}

Retorne APENAS JSON válido.`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      return getFallbackAnalysis()
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    let jsonStr = content.trim()
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    
    return JSON.parse(jsonStr)
  } catch {
    return getFallbackAnalysis()
  }
}

function getFallbackMatches(): Match[] {
  const brasilia = getBrasiliaDate()
  const dateStr = brasilia.toISOString().split('T')[0]
  
  return [
    { id: '1', home_team: 'Brasil', away_team: 'Colômbia', league: 'Eliminatórias Copa do Mundo', country: 'Brasil', date: dateStr, time: '21:30', datetime: `${dateStr}T21:30:00-03:00`, venue: 'Estádio do Maracanã, Rio de Janeiro', status: 'scheduled', hours_until: 6, countdown: '6h' },
    { id: '2', home_team: 'Argentina', away_team: 'Uruguai', league: 'Eliminatórias Copa do Mundo', country: 'Argentina', date: dateStr, time: '20:00', datetime: `${dateStr}T20:00:00-03:00`, venue: 'Estadio Monumental, Buenos Aires', status: 'scheduled', hours_until: 5, countdown: '5h' },
  ]
}

function getFallbackAnalysis(): Analysis {
  return {
    home_win_prob: 45,
    draw_prob: 25,
    away_win_prob: 30,
    factors: ['Dados insuficientes'],
    prediction: 'Empate'
  }
}
