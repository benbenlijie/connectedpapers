import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AiAssistantPanel from './AiAssistantPanel'

vi.mock('../lib/aiAgent', () => ({
  ensureSession: vi.fn(async () => 's1'),
  sendMessage: vi.fn(async () => {}),
  abortSession: vi.fn(async () => {}),
  fetchHistory: vi.fn(async () => []),
  streamEvents: vi.fn(() => () => {}),
}))

afterEach(() => vi.clearAllMocks())

describe('AiAssistantPanel', () => {
  it('boots a session and sends a message', async () => {
    const { ensureSession, sendMessage } = await import('../lib/aiAgent')
    render(<AiAssistantPanel arxivId="2401.00001" selection="" target="zh" onClose={() => {}} />)
    await waitFor(() => expect(ensureSession).toHaveBeenCalledWith('2401.00001'))
    fireEvent.change(screen.getByPlaceholderText('就论文提问…'), { target: { value: 'loss?' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => expect(sendMessage).toHaveBeenCalled())
    expect((sendMessage as any).mock.calls[0][0]).toMatchObject({ sessionId: 's1', message: 'loss?', target: 'zh' })
  })

  it('shows an error when session bootstrap fails', async () => {
    const { ensureSession } = await import('../lib/aiAgent')
    ;(ensureSession as any).mockRejectedValueOnce(new Error('nope'))
    render(<AiAssistantPanel arxivId="x" selection="" target="zh" onClose={() => {}} />)
    expect(await screen.findByText(/nope/)).toBeTruthy()
  })
})
