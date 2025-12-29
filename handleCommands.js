import ping from './comandos/ping.js'

export default async function handleCommands(sock, msg) {
  const from = msg.key.remoteJid
  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text

  if (!text) return

  const comando = text.toLowerCase().trim()

  if (comando === 'ping') {
    await ping(sock, from)
  }
}
