import type { ChatMessage } from './llm'

export type AiAction = 'explain' | 'summarize' | 'ask'

export interface AiInput {
  text?: string
  question?: string
  context?: string
}

export const AI_ACTIONS: AiAction[] = ['explain', 'summarize', 'ask']

function system(target: string, instruction: string): ChatMessage {
  return {
    role: 'system',
    content: `You are a research assistant helping read academic papers. Answer in ${target}. ${instruction}`,
  }
}

export function buildAiMessages(action: AiAction, input: AiInput, target: string): ChatMessage[] {
  const context = input.context ? `Paper context:\n${input.context}\n\n` : ''
  const text = (input.text ?? '').trim()

  switch (action) {
    case 'explain':
      if (!text) throw new Error('缺少要解释的文本')
      return [
        system(target, 'Explain the excerpt so a newcomer understands it. Be precise and concise.'),
        { role: 'user', content: `${context}Excerpt:\n${text}` },
      ]
    case 'summarize':
      if (!text) throw new Error('缺少要总结的文本')
      return [
        system(target, 'Summarize the excerpt, keeping the key points.'),
        { role: 'user', content: `${context}Excerpt:\n${text}` },
      ]
    case 'ask': {
      const question = (input.question ?? '').trim()
      if (!question) throw new Error('缺少问题')
      return [
        system(target, "Answer the user's question about the paper. Be precise and concise."),
        { role: 'user', content: `${context}Excerpt:\n${text}\n\nQuestion: ${question}` },
      ]
    }
    default:
      throw new Error(`未知的 AI action: ${action}`)
  }
}
