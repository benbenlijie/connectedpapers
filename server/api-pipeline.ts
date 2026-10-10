import { clientIpFrom } from './auth'
import { ApiError, handleError } from './errors'
import { createRateLimiter } from './rateLimit'

interface ApiPipelineOptions {
  rateLimitPerMin: number
  trustProxy: boolean
  requestIp: (req: Request) => string
  rateLimitExempt: string[]
  dispatch: (req: Request) => Promise<Response>
}

/** Apply the API-wide per-IP limit before dispatching to an endpoint. */
export function createApiPipeline(options: ApiPipelineOptions) {
  const limiter = options.rateLimitPerMin > 0
    ? createRateLimiter({ windowMs: 60_000, max: options.rateLimitPerMin })
    : null

  return async (req: Request): Promise<Response> => {
    const pathname = new URL(req.url).pathname
    try {
      if (limiter && pathname.startsWith('/api/') && !options.rateLimitExempt.some((prefix) => pathname.startsWith(prefix))) {
        const ip = clientIpFrom(req.headers, options.trustProxy, options.requestIp(req))
        if (!limiter(ip)) throw new ApiError('RATE_LIMITED', '请求过于频繁，请稍后重试', 429)
      }
      return await options.dispatch(req)
    } catch (error) {
      return handleError(error)
    }
  }
}
