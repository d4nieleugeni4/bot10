import config from "../config.js";

// Função auxiliar para extrair o ID limpo (sem identificadores de dispositivo)
function parseJid(jid = "") {
  return jid.split("@")[0].split(":")[0] + "@s.whatsapp.net";
}

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Só funciona em grupos
    if (!remoteJid.endsWith("@g.us")) return;

    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    // ID do Bot (tratado para remover o :sessão se houver)
    const botJid = parseJid(sock.user.id);
    // ID de quem enviou a mensagem
    const senderJid = parseJid(msg.key.participant || msg.key.remoteJid);

    // =========================
    // 👑 LISTA REAL DE ADMINS
    // =========================
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => p.id);

    // =========================
    // 👑 USUÁRIO É ADMIN?
    // =========================
    const isUserAdmin = admins.includes(senderJid);
    if (!isUserAdmin) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Apenas administradores podem usar este comando.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🤖 BOT É ADMIN?
    // =========================
    // Corrigido: Verifica se o botJid ou qualquer variação dele está na lista
    const isBotAdmin = participants.some(p => parseJid(p.id) === botJid && (p.admin === "admin" || p.admin === "superadmin"));
    
    if (!isBotAdmin) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Eu preciso ser administrador para remover alguém.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 👤 DEFINIR ALVO
    // =========================
    let targetJid = null;

    // Pela resposta (reply)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) {
      targetJid = parseJid(quoted);
    }

    // Por menção (@user)
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!targetJid && mentioned?.length) {
      targetJid = parseJid(mentioned[0]);
    }

    if (!targetJid) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Marque alguém ou responda a uma mensagem para banir.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🚫 VALIDAÇÕES DE SEGURANÇA
    // =========================
    if (targetJid === senderJid) {
      await sock.sendMessage(remoteJid, { text: "❌ Você não pode se remover.", quoted: msg });
      return;
    }

    if (targetJid === botJid) {
      await sock.sendMessage(remoteJid, { text: "❌ Eu não posso me remover.", quoted: msg });
      return;
    }

    const donoJid = config.dono.numero.replace(/\D/g, "") + "@s.whatsapp.net";
    if (targetJid === donoJid) {
      await sock.sendMessage(remoteJid, { text: "❌ Você não pode remover o dono do bot.", quoted: msg });
      return;
    }

    // =========================
    // 🚫 EXECUTAR REMOÇÃO
    // =========================
    try {
      await sock.groupParticipantsUpdate(remoteJid, [targetJid], "remove");

      await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
      await sock.sendMessage(remoteJid, { text: "✅ Membro removido com sucesso!", quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(remoteJid, { text: "❌ Ocorreu um erro ao tentar remover o usuário.", quoted: msg });
    }
  }
};
