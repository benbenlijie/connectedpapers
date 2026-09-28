import { z } from 'zod'

export const paperSchema = z.object({
  id: z.string().optional(),
  semantic_scholar_id: z.string().optional(),
  openalex_id: z.string().optional(),
  title: z.string().nullish(),
  abstract: z.string().nullish(),
  publication_year: z.number().nullish(),
  citation_count: z.number().nullish(),
  authors: z.string().nullish(),
  venue: z.string().nullish(),
  journal: z.string().nullish(),
  url: z.string().nullish(),
  pdf_url: z.string().nullish(),
  doi: z.string().nullish(),
  fields_of_study: z.array(z.string()).optional(),
  source: z.string(),
}).passthrough()

export const searchResponseSchema = z.object({
  data: z.object({ papers: z.array(paperSchema), total_count: z.number() }),
})

export const networkDataSchema = z.object({
  nodes: z.array(z.object({ id: z.string() }).passthrough()),
  edges: z.array(z.object({ from: z.string(), to: z.string() }).passthrough()),
})

export const jobStatusSchema = z.object({
  status: z.enum(['pending', 'running', 'done', 'failed']),
  progress: z.any().optional(),
  data: networkDataSchema.nullish(),
  error: z.string().nullish(),
})

export const detailsResponseSchema = z.object({ data: z.object({ paper: z.any() }).passthrough() })
