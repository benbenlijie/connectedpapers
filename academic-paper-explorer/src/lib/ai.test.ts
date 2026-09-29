import { describe, it, expect, vi } from 'vitest'
import { askAi, type AiDeps } from './ai'

function makeDeps(over: Partial<AiDeps> = {}): AiDeps {
  return {
    fetchProviders: vi.fn(async () => [
      { name: 'browser', kind: 'browser' as const },
      { name: 'mtcode', kind: 'openai' as const, model: 'm' },
    ]),
    askViaServer: vi.fn(async () => 'answer'),
    ...over,
  }
}

describe('askAi', () => {
  it('ignores browser providers and asks the first openai provider', async () => {
    const deps = makeDeps()
    const out = await askAi('explain', { text: 'x' }, 'zh', deps)
    expect(out).toEqual({ answer: 'answer', provider: 'mtcode' })
    expect(deps.askViaServer).toHaveBeenCalledWith('mtcode', 'explain', { text: 'x' }, 'zh')
  })

  it('advances to the next openai provider on failure', async () => {
    const deps = makeDeps({
      fetchProviders: vi.fn(async () => [
        { name: 'a', kind: 'openai' as const },
        { name: 'b', kind: 'openai' as const },
      ]),
      askViaServer: vi.fn(async (name: string) => {
        if (name === 'a') throw new Error('x')
        return 'ok'
      }),
    })
    const out = await askAi('ask', { question: 'q' }, 'zh', deps)
    expect(out.provider).toBe('b')
  })

  it('throws when no openai provider is configured', async () => {
    const deps = makeDeps({ fetchProviders: vi.fn(async () => [{ name: 'browser', kind: 'browser' as const }]) })
    await expect(askAi('explain', { text: 'x' }, 'zh', deps)).rejects.toThrow()
  })

  it('throws the last error when every provider fails', async () => {
    const deps = makeDeps({
      askViaServer: vi.fn(async () => {
        throw new Error('nope')
      }),
    })
    await expect(askAi('explain', { text: 'x' }, 'zh', deps)).rejects.toThrow('nope')
  })
})
