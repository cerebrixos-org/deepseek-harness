import { createInterface } from 'node:readline'

const input = createInterface({ input: process.stdin })
const reply = (id, result) => { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`) }

input.on('line', (line) => {
  const message = JSON.parse(line)
  if (message.id === undefined) return
  if (message.method === 'initialize') {
    reply(message.id, {
      protocolVersion: message.params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'hyperlake-profile-fixture', version: '1.0.0' },
    })
    return
  }
  if (message.method === 'tools/list') {
    reply(message.id, { tools: [] })
    return
  }
  reply(message.id, {})
})
