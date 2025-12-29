module.exports = async (sock, msg) => {
  const from = msg.key.remoteJid;
  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text;

  if (!text) return;

  if (text.toLowerCase() === "ping") {
    await sock.sendMessage(from, { text: "🏓 Pong!" });
  }
};
