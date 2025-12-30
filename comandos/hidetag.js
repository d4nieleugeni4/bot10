export default {
  nome: "hidetag",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Apenas grupos
    if (!remoteJid.endsWith("@g.us")) return;

    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    const fullArgs = texto.split(" ").slice(1).join(" ");

    // 📋 Metadata do grupo
    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    // 👑 Verificar admin
    const sender = msg.key.participant;
    const isAdmin = participants.some(
      (p) =>
        p.id === sender &&
        (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!isAdmin) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Apenas administradores podem usar este comando.",
        quoted: msg
      });
      return;
    }

    // 👥 Menções (hidetag)
    const mentions = participants.map(p => p.id);

    // 😀 Reação
    await sock.sendMessage(remoteJid, {
      react: {
        text: "📢",
        key: msg.key
      }
    });

    // 📢 Mensagem principal
    await sock.sendMessage(
      remoteJid,
      {
        text: `📢 Marcando todos...\n\n${fullArgs || ""}`,
        mentions
      },
      { quoted: msg }
    );
  }
};
