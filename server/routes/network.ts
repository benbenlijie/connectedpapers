import { json, ApiError } from '../errors'

export function networkRoute(_req: Request): Response {
  throw new ApiError('INTERNAL_SERVER_ERROR', 'not implemented yet', 501)
}
