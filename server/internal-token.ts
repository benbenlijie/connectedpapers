import { env } from './env'

/** Shared secret for the internal paper-retrieval API and the spawned tool. */
export const INTERNAL_TOKEN = env.internalToken ?? Bun.randomUUIDv7()
