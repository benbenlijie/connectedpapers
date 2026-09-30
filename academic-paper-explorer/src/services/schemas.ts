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
  arxiv_id: z.string().nullish(),
  fields_of_study: z.array(z.string()).optional(),
  source: z.string(),
}).passthrough()

export const searchResponseSchema = z.object({
  data: z.object({ papers: z.array(paperSchema), total_count: z.number() }),
  warning: z.string().nullish(),
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

export const lineagePaperSchema = z.object({
  paperId: z.string(),
  title: z.string().nullish(),
  year: z.number().nullish(),
  citationCount: z.number().nullish(),
  venue: z.string().nullish(),
  authors: z.string().nullish(),
  isInfluential: z.boolean().nullish(),
})

export const lineageResponseSchema = z.object({
  data: z.object({
    root_id: z.string(),
    prior: z.array(lineagePaperSchema),
    followUps: z.array(lineagePaperSchema),
  }),
})
