function opt(name: string): string | undefined {
  const v = Bun.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export const env = {
  semanticScholarApiKey: opt('SEMANTIC_SCHOLAR_API_KEY'),
  contactEmail: opt('CONTACT_EMAIL') ?? 'researcher@example.com',
  port: Number(opt('PORT') ?? 8787),
  hostname: opt('HOST') ?? '127.0.0.1',
}
