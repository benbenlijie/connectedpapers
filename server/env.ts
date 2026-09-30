function opt(name: string): string | undefined {
  const v = Bun.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export const env = {
  semanticScholarApiKey: opt('SEMANTIC_SCHOLAR_API_KEY'),
  openalexApiKey: opt('OPENALEX_API_KEY'),
  contactEmail: opt('CONTACT_EMAIL') ?? 'researcher@example.com',
  accessToken: opt('ACCESS_TOKEN'),
  internalToken: opt('INTERNAL_TOKEN'),
  basePath: opt('BASE_PATH') ?? '',
  trustProxy: opt('TRUST_PROXY') === '1' || opt('TRUST_PROXY') === 'true',
  port: Number(opt('PORT') ?? 8787),
  hostname: opt('HOST') ?? '127.0.0.1',
}
