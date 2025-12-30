export default {
  nome: "ping",

  async executar(sock, msg) {
    const from = msg.key.remoteJid;

    await sock.sendMessage(from, {
      text: "🏓 Pong!"
    });
  }
};
