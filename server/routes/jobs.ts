import { json, ApiError } from '../errors'

export function jobRoute(_req: Request, _id: string): Response {
  throw new ApiError('INTERNAL_SERVER_ERROR', 'not implemented yet', 501)
}
