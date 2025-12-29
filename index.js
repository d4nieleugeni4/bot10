import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import P from 'pino'
import handleCommands from './handleCommands.js'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false // NÃO usar QR
  })

  // 👉 GERA O CÓDIGO DE 6 DÍGITOS
  if (!sock.authState.creds.registered) {
    const numero = '55DDDNUMERO' // Ex: 5511999999999
    const code = await sock.requestPairingCode(numero)
    console.log('📲 Código de pareamento:', code)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado com sucesso!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    await handleCommands(sock, msg)
  })
}

startBot()
