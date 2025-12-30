import config from "./config.js";

export default async function handleCommands(sock, msg) {
  const from = msg.key.remoteJid;

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text;

  if (!text) return;

  const prefixo = config.prefixo;
  let comando = text.trim().toLowerCase();

  // 🔹 Se tiver prefixo definido, exige prefixo
  if (prefixo) {
    if (!comando.startsWith(prefixo)) return;
    comando = comando.slice(prefixo.length).trim();
  }

  if (comando === "ping") {
    await sock.sendMessage(from, {
      text: "🏓 Pong!"
    });
  }
}
