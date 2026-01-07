// =============================================================================
// NANOGPT SERVICE
// =============================================================================
// Wrapper for NanoGPT API endpoints: web search, URL scraping, YouTube transcription.
// Supports multi-provider search (Linkup + Tavily) with score boosting for recurring URLs.

import { Result, Errors, logger, type AppError } from '../core'

const log = logger.child({ module: 'nanogpt-service' })

// =============================================================================
// TYPES
// =============================================================================

export type SearchProvider = 'linkup' | 'tavily'
export type SearchDepth = 'standard' | 'deep'

export interface WebSearchRequest {
  query: string
  depth?: SearchDepth
  provider?: SearchProvider
  outputType?: 'searchResults' | 'sourcedAnswer' | 'structured'
  includeDomains?: string[]
  excludeDomains?: string[]
  fromDate?: string  // YYYY-MM-DD
  toDate?: string    // YYYY-MM-DD
  includeImages?: boolean
}

export interface WebSearchResult {
  url: string
  title: string
  snippet: string
  domain: string
}

export interface ScoredSearchResult extends WebSearchResult {
  providers: SearchProvider[]
  baseScore: number
  providerBoost: number
  finalScore: number
}

export interface SourcedAnswerResult {
  answer: string
  sources: Array<{
    name: string
    url: string
    snippet: string
  }>
}

export interface ScrapeRequest {
  urls: string[]  // max 5
  stealthMode?: boolean
}

export interface ScrapeResult {
  url: string
  success: boolean
  title?: string
  content?: string
  markdown?: string
  error?: string
}

export interface YouTubeTranscribeRequest {
  urls: string[]  // max 10
}

export interface YouTubeTranscribeResult {
  url: string
  success: boolean
  title?: string
  transcript?: string
  error?: string
}

export interface MultiSearchRequest {
  query: string
  depth?: SearchDepth
  useProviders?: SearchProvider[]  // Default: both
  excludeDomains?: string[]
  includeDomains?: string[]
  fromDate?: string
  toDate?: string
}

export interface RateLimitStatus {
  web: { current: number; limit: number; resetAt: number }
  scrape: { current: number; limit: number; resetAt: number }
  youtube: { current: number; limit: number; resetAt: number }
}

export interface CostEstimate {
  webSearches: number
  urlScrapes: number
  youtubeTranscripts: number
  totalUsd: number
}

// =============================================================================
// RATE LIMITS
// =============================================================================

const RATE_LIMITS = {
  web: { perMinute: 10, costStandard: 0.006, costDeep: 0.06 },
  scrape: { perMinute: 30, costPerUrl: 0.001, costStealth: 0.005 },
  youtube: { perMinute: 10, costPerVideo: 0.01 },
}

// Tavily costs (different from Linkup)
const TAVILY_COSTS = {
  standard: 0.008,
  deep: 0.016,
}

// Rate limit tracking (sliding window)
const rateLimitWindows = {
  web: [] as number[],
  scrape: [] as number[],
  youtube: [] as number[],
}

function cleanRateLimitWindow(endpoint: 'web' | 'scrape' | 'youtube'): void {
  const oneMinuteAgo = Date.now() - 60000
  rateLimitWindows[endpoint] = rateLimitWindows[endpoint].filter(t => t > oneMinuteAgo)
}

function canMakeRequest(endpoint: 'web' | 'scrape' | 'youtube'): boolean {
  cleanRateLimitWindow(endpoint)
  return rateLimitWindows[endpoint].length < RATE_LIMITS[endpoint].perMinute
}

function recordRequest(endpoint: 'web' | 'scrape' | 'youtube'): void {
  rateLimitWindows[endpoint].push(Date.now())
}

function getWaitTime(endpoint: 'web' | 'scrape' | 'youtube'): number {
  cleanRateLimitWindow(endpoint)
  if (rateLimitWindows[endpoint].length < RATE_LIMITS[endpoint].perMinute) {
    return 0
  }
  const oldestRequest = Math.min(...rateLimitWindows[endpoint])
  return oldestRequest + 60000 - Date.now()
}

// =============================================================================
// API HELPERS
// =============================================================================

const NANOGPT_BASE_URL = 'https://nano-gpt.com/api'

interface NanoGPTError {
  error?: string
  message?: string
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Result<T>> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as NanoGPTError
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`

        if (response.status === 429) {
          // Rate limited - wait and retry
          if (attempt < maxRetries) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10) * 1000
            log.warn('Rate limited, waiting to retry', { url, retryAfter, attempt })
            await new Promise(resolve => setTimeout(resolve, retryAfter))
            continue
          }
          return Result.err(Errors.ai.rateLimited())
        }

        if (response.status === 401) {
          return Result.err(Errors.ai.invalidCredentials('nanogpt'))
        }

        if (response.status === 402) {
          return Result.err(new AppError({
            code: 'AI_REQUEST_FAILED',
            message: 'Insufficient NanoGPT balance',
            recoverable: true,
          }))
        }

        return Result.err(Errors.ai.requestFailed('nanogpt', new Error(errorMessage)))
      }

      const data = await response.json() as T
      return Result.ok(data)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries) {
        log.warn('Request failed, retrying', { url, attempt, error: lastError.message })
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  return Result.err(Errors.ai.requestFailed('nanogpt', lastError))
}

// =============================================================================
// NANOGPT SERVICE
// =============================================================================

export const NanoGPTService = {
  // ---------------------------------------------------------------------------
  // WEB SEARCH
  // ---------------------------------------------------------------------------

  async webSearch(
    req: WebSearchRequest,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Result<WebSearchResult[]>> {
    if (!canMakeRequest('web')) {
      const waitTime = getWaitTime('web')
      log.warn('Rate limit reached for web search', { waitTimeMs: waitTime })
      return Result.err(Errors.ai.rateLimited(Math.ceil(waitTime / 1000)))
    }

    const provider = req.provider ?? 'linkup'
    const depth = req.depth ?? 'standard'

    // Build request body based on provider
    // NanoGPT uses Linkup by default, Tavily requires different endpoint handling
    const body: Record<string, unknown> = {
      query: req.query,
      depth,
      outputType: req.outputType ?? 'searchResults',
    }

    if (req.includeDomains?.length) {
      body.includeDomains = req.includeDomains
    }
    if (req.excludeDomains?.length) {
      body.excludeDomains = req.excludeDomains
    }
    if (req.fromDate) {
      body.fromDate = req.fromDate
    }
    if (req.toDate) {
      body.toDate = req.toDate
    }
    if (req.includeImages) {
      body.includeImages = req.includeImages
    }

    recordRequest('web')

    const result = await fetchWithRetry<{
      data: Array<{
        type: string
        url?: string
        title?: string
        content?: string
      }>
      metadata: {
        query: string
        depth: string
        cost: number
      }
    }>(`${NANOGPT_BASE_URL}/web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!result.ok) {
      return result
    }

    // Parse results
    const searchResults: WebSearchResult[] = result.value.data
      .filter(item => item.type === 'text' && item.url)
      .map(item => {
        const url = new URL(item.url!)
        return {
          url: item.url!,
          title: item.title ?? '',
          snippet: item.content ?? '',
          domain: url.hostname.replace(/^www\./, ''),
        }
      })

    log.info('Web search completed', {
      provider,
      depth,
      resultCount: searchResults.length,
      cost: result.value.metadata.cost,
    })

    return Result.ok(searchResults)
  },

  async sourcedAnswer(
    query: string,
    apiKey: string,
    depth: SearchDepth = 'standard',
    signal?: AbortSignal
  ): Promise<Result<SourcedAnswerResult>> {
    if (!canMakeRequest('web')) {
      const waitTime = getWaitTime('web')
      return Result.err(Errors.ai.rateLimited(Math.ceil(waitTime / 1000)))
    }

    recordRequest('web')

    const result = await fetchWithRetry<{
      data: {
        answer: string
        sources: Array<{
          name: string
          url: string
          snippet: string
        }>
      }
      metadata: {
        cost: number
      }
    }>(`${NANOGPT_BASE_URL}/web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        depth,
        outputType: 'sourcedAnswer',
      }),
      signal,
    })

    if (!result.ok) {
      return result
    }

    return Result.ok(result.value.data)
  },

  // ---------------------------------------------------------------------------
  // MULTI-PROVIDER SEARCH
  // ---------------------------------------------------------------------------

  async multiProviderSearch(
    req: MultiSearchRequest,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Result<ScoredSearchResult[]>> {
    const providers = req.useProviders ?? ['linkup', 'tavily']
    const depth = req.depth ?? 'standard'

    // Run searches in parallel
    const searchPromises = providers.map(provider =>
      this.webSearch(
        {
          query: req.query,
          depth,
          provider,
          excludeDomains: req.excludeDomains,
          includeDomains: req.includeDomains,
          fromDate: req.fromDate,
          toDate: req.toDate,
        },
        apiKey,
        signal
      ).then(result => ({ provider, result }))
    )

    const searchResults = await Promise.all(searchPromises)

    // Merge results
    const urlMap = new Map<string, ScoredSearchResult>()

    for (const { provider, result } of searchResults) {
      if (!result.ok) {
        log.warn('Provider search failed', { provider, error: result.error.message })
        continue
      }

      for (const item of result.value) {
        const normalizedUrl = item.url.toLowerCase().replace(/\/$/, '')
        const existing = urlMap.get(normalizedUrl)

        if (existing) {
          // URL found by multiple providers - boost score
          if (!existing.providers.includes(provider)) {
            existing.providers.push(provider)
            existing.providerBoost = 0.2  // Boost for appearing in both
            existing.finalScore = existing.baseScore + existing.providerBoost
          }
        } else {
          // New URL
          const baseScore = 0.5  // Default relevance
          urlMap.set(normalizedUrl, {
            ...item,
            providers: [provider],
            baseScore,
            providerBoost: 0,
            finalScore: baseScore,
          })
        }
      }
    }

    // Sort by final score (URLs found by multiple providers rank higher)
    const mergedResults = Array.from(urlMap.values())
      .sort((a, b) => {
        // First by provider count (more providers = better)
        if (b.providers.length !== a.providers.length) {
          return b.providers.length - a.providers.length
        }
        // Then by final score
        return b.finalScore - a.finalScore
      })

    log.info('Multi-provider search completed', {
      providers,
      depth,
      totalResults: mergedResults.length,
      multiProviderHits: mergedResults.filter(r => r.providers.length > 1).length,
    })

    return Result.ok(mergedResults)
  },

  // ---------------------------------------------------------------------------
  // URL SCRAPING
  // ---------------------------------------------------------------------------

  async scrapeUrls(
    req: ScrapeRequest,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Result<ScrapeResult[]>> {
    if (req.urls.length === 0) {
      return Result.ok([])
    }

    if (req.urls.length > 5) {
      return Result.err(Errors.validation.invalid('urls', 'Maximum 5 URLs per request'))
    }

    if (!canMakeRequest('scrape')) {
      const waitTime = getWaitTime('scrape')
      return Result.err(Errors.ai.rateLimited(Math.ceil(waitTime / 1000)))
    }

    recordRequest('scrape')

    const result = await fetchWithRetry<{
      results: Array<{
        url: string
        success: boolean
        title?: string
        content?: string
        markdown?: string
        error?: string
      }>
      summary: {
        requested: number
        processed: number
        successful: number
        failed: number
        totalCost: number
        stealthModeUsed: boolean
      }
    }>(`${NANOGPT_BASE_URL}/scrape-urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        urls: req.urls,
        stealthMode: req.stealthMode ?? false,
      }),
      signal,
    })

    if (!result.ok) {
      return result
    }

    log.info('URL scraping completed', {
      requested: result.value.summary.requested,
      successful: result.value.summary.successful,
      failed: result.value.summary.failed,
      cost: result.value.summary.totalCost,
    })

    return Result.ok(result.value.results)
  },

  // ---------------------------------------------------------------------------
  // YOUTUBE TRANSCRIPTION
  // ---------------------------------------------------------------------------

  async transcribeYoutube(
    req: YouTubeTranscribeRequest,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Result<YouTubeTranscribeResult[]>> {
    if (req.urls.length === 0) {
      return Result.ok([])
    }

    if (req.urls.length > 10) {
      return Result.err(Errors.validation.invalid('urls', 'Maximum 10 URLs per request'))
    }

    if (!canMakeRequest('youtube')) {
      const waitTime = getWaitTime('youtube')
      return Result.err(Errors.ai.rateLimited(Math.ceil(waitTime / 1000)))
    }

    recordRequest('youtube')

    const result = await fetchWithRetry<{
      transcripts: Array<{
        url: string
        success: boolean
        title?: string
        transcript?: string
        error?: string
      }>
      summary: {
        requested: number
        processed: number
        successful: number
        failed: number
        totalCost: number
      }
    }>(`${NANOGPT_BASE_URL}/youtube-transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        urls: req.urls,
      }),
      signal,
    })

    if (!result.ok) {
      return result
    }

    log.info('YouTube transcription completed', {
      requested: result.value.summary.requested,
      successful: result.value.summary.successful,
      failed: result.value.summary.failed,
      cost: result.value.summary.totalCost,
    })

    return Result.ok(result.value.transcripts)
  },

  // ---------------------------------------------------------------------------
  // RATE LIMIT STATUS
  // ---------------------------------------------------------------------------

  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now()
    const oneMinuteFromNow = now + 60000

    cleanRateLimitWindow('web')
    cleanRateLimitWindow('scrape')
    cleanRateLimitWindow('youtube')

    return {
      web: {
        current: rateLimitWindows.web.length,
        limit: RATE_LIMITS.web.perMinute,
        resetAt: rateLimitWindows.web.length > 0
          ? Math.min(...rateLimitWindows.web) + 60000
          : oneMinuteFromNow,
      },
      scrape: {
        current: rateLimitWindows.scrape.length,
        limit: RATE_LIMITS.scrape.perMinute,
        resetAt: rateLimitWindows.scrape.length > 0
          ? Math.min(...rateLimitWindows.scrape) + 60000
          : oneMinuteFromNow,
      },
      youtube: {
        current: rateLimitWindows.youtube.length,
        limit: RATE_LIMITS.youtube.perMinute,
        resetAt: rateLimitWindows.youtube.length > 0
          ? Math.min(...rateLimitWindows.youtube) + 60000
          : oneMinuteFromNow,
      },
    }
  },

  // ---------------------------------------------------------------------------
  // COST ESTIMATION
  // ---------------------------------------------------------------------------

  estimateCost(config: {
    webSearches?: number
    webSearchDepth?: SearchDepth
    useBothProviders?: boolean
    urlScrapes?: number
    stealthMode?: boolean
    youtubeTranscripts?: number
  }): CostEstimate {
    const webSearches = config.webSearches ?? 0
    const depth = config.webSearchDepth ?? 'standard'
    const bothProviders = config.useBothProviders ?? false
    const urlScrapes = config.urlScrapes ?? 0
    const stealthMode = config.stealthMode ?? false
    const youtubeTranscripts = config.youtubeTranscripts ?? 0

    // Web search cost
    let webCost = 0
    if (bothProviders) {
      // Linkup + Tavily
      const linkupCost = depth === 'deep' ? RATE_LIMITS.web.costDeep : RATE_LIMITS.web.costStandard
      const tavilyCost = depth === 'deep' ? TAVILY_COSTS.deep : TAVILY_COSTS.standard
      webCost = webSearches * (linkupCost + tavilyCost)
    } else {
      const costPerSearch = depth === 'deep' ? RATE_LIMITS.web.costDeep : RATE_LIMITS.web.costStandard
      webCost = webSearches * costPerSearch
    }

    // Scrape cost
    const scrapeCostPerUrl = stealthMode ? RATE_LIMITS.scrape.costStealth : RATE_LIMITS.scrape.costPerUrl
    const scrapeCost = urlScrapes * scrapeCostPerUrl

    // YouTube cost
    const youtubeCost = youtubeTranscripts * RATE_LIMITS.youtube.costPerVideo

    return {
      webSearches,
      urlScrapes,
      youtubeTranscripts,
      totalUsd: webCost + scrapeCost + youtubeCost,
    }
  },

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  isYouTubeUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return (
        parsed.hostname.includes('youtube.com') ||
        parsed.hostname.includes('youtu.be') ||
        parsed.hostname.includes('m.youtube.com')
      )
    } catch {
      return false
    }
  },

  extractDomain(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  },
}
