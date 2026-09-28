import { json, ApiError } from '../errors'

export function detailsRoute(_req: Request): Response {
  throw new ApiError('INTERNAL_SERVER_ERROR', 'not implemented yet', 501)
}
