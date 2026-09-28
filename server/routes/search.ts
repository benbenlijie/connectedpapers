import { json, ApiError } from '../errors'

export function searchRoute(_req: Request): Response {
  throw new ApiError('INTERNAL_SERVER_ERROR', 'not implemented yet', 501)
}
