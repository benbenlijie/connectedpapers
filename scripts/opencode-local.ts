// Run a standalone opencode server for a remote connectedpapers deployment.
//
// The remote Bun server sets OPENCODE_BASE_URL and connects through a reverse
// SSH tunnel; this process (on your machine) owns the opencode runtime and its
// retrieval tools. Configure via env:
//   OPENCODE_PORT          opencode listen port (default 4096 from config)
//   OPENCODE_RUNTIME_DIR   persistent runtime dir (default ~/.local/share/connectedpapers-opencode)
//   PAPER_API_BASE         public API base of the remote app, e.g. https://watchdeep.net/papers/api
//   INTERNAL_TOKEN         must match the remote server's INTERNAL_TOKEN
//
// Run with the local provider config:
//   bun --env-file=server/.env run scripts/opencode-local.ts
import { join } from 'node:path'
import { OpencodeManager } from '../server/opencode'
import { config } from '../server/config'

const runtimeDir =
  Bun.env.OPENCODE_RUNTIME_DIR ?? join(Bun.env.HOME ?? '.', '.local/share/connectedpapers-opencode')
const port = config.ai.port
const manager = new OpencodeManager({ runtimeDir, baseUrl: `http://127.0.0.1:${port}`, port })

console.log(
  `[opencode-local] runtime=${runtimeDir} port=${port} paperApi=${Bun.env.PAPER_API_BASE ?? '(unset)'}`,
)
await manager.start()
console.log('[opencode-local] ready; Ctrl-C to stop')

const stop = async () => {
  try {
    await manager.stop()
  } finally {
    process.exit(0)
  }
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())

await new Promise(() => {})
