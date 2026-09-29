import { json } from '../errors'
import { loadProviders, toPublicProvider } from '../llm'

export async function llmStatusRoute(): Promise<Response> {
  return json({ data: { providers: loadProviders().map(toPublicProvider) } })
}
