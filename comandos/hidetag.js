export default {
  nome: "hidetag",

  async executar(sock, msg) {
    const from = msg.key.remoteJid;

    // ❌ Só funciona em grupo
    if (!from.endsWith("@g.us")) return;

    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    const mensagem = texto.split(" ").slice(1).join(" ") || " ";

    // 🔍 Metadata do grupo
    const metadata = await sock.groupMetadata(from);
    const participantes = metadata.participants;

    // 👑 Verificar se quem enviou é admin
    const sender = msg.key.participant;
    const isAdmin = participantes.some(
      p =>
        p.id === sender &&
        (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!isAdmin) {
      await sock.sendMessage(from, {
        text: "❌ Apenas administradores podem usar este comando."
      });
      return;
    }

    // 👥 Marcar todos
    const mentions = participantes.map(p => p.id);

    await sock.sendMessage(from, {
      text: mensagem,
      mentions
    });
  }
};
