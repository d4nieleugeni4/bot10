export default async function ping(sock, from) {
  await sock.sendMessage(from, {
    text: '🏓 Pong!'
  })
}
