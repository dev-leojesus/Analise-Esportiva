# Football Analyzer - Specification

## 1. Project Overview

**Name:** Football Analyzer  
**Type:** Web Application (Next.js + Vercel)  
**Core Functionality:** Análise pré-live de jogos de futebol com dados fornecidos pelo modelo de linguagem MiniMax 2.5 Free via OpenRouter  
**Target Users:** Apostadores esportivos e analistas de futebol

## 2. Technical Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **LLM:** MiniMax 2.5 Free via OpenRouter API
- **Deployment:** Vercel

## 3. Features

1. **Dashboard de Jogos**
   - Lista de jogos das próximas 24h
   - Busca em tempo real via LLM
   - Atualização automática a cada 30 segundos

2. **Análise de Partidas**
   - Probabilidades estimadas
   - Fatores importantes
   - Palpite recomendado

3. **Filtros**
   - Por país/liga
   - Atualização manual

## 4. UI/UX

- Layout responsivo
- Tema claro/escuro
- Cards de partidas interativos
- Loading states

## 5. API Integration

- OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
- Model: `minimax/MiniMax-M2.5-Free`
- Fallback com dados estáticos em caso de erro
