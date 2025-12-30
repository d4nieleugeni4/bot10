import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Só funciona em grupos
    if (!remoteJid.endsWith("@g.us")) return;

    // 📋 Obter dados do grupo e participantes
    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    // 🛠️ FUNÇÃO PARA NORMALIZAR O ID (Remove o :sessão do bot ou usuário)
    const normalizeJid = (jid) => jid.split('@')[0].split(':')[0] + '@s.whatsapp.net';

    // IDs Normalizados
    const botJid = normalizeJid(sock.user.id);
    const senderJid = normalizeJid(msg.key.participant || msg.key.remoteJid);

    // =========================
    // 👑 VERIFICAR QUEM É ADMIN
    // =========================
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => normalizeJid(p.id));

    const isUserAdmin = admins.includes(senderJid);
    const isBotAdmin = admins.includes(botJid);

    // =========================
    // 🛡️ VALIDAÇÕES DE PERMISSÃO
    // =========================
    if (!isUserAdmin) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Erro: Você não consta na lista de administradores deste grupo.",
        quoted: msg
      });
    }

    if (!isBotAdmin) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Erro: Eu (o Bot) preciso ser administrador para banir alguém.",
        quoted: msg
      });
    }

    // =========================
    // 👤 DEFINIR ALVO (Target)
    // =========================
    let targetJid = null;

    // 1. Por resposta (quoted)
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quotedParticipant) {
      targetJid = normalizeJid(quotedParticipant);
    }

    // 2. Por menção (mention)
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!targetJid && mentioned?.length) {
      targetJid = normalizeJid(mentioned[0]);
    }

    if (!targetJid) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Marque alguém ou responda a mensagem de quem deseja banir.",
        quoted: msg
      });
    }

    // =========================
    // 🚫 REGRAS DE SEGURANÇA
    // =========================
    if (targetJid === senderJid) {
      return await sock.sendMessage(remoteJid, { text: "❌ Você não pode banir a si mesmo.", quoted: msg });
    }

    if (targetJid === botJid) {
      return await sock.sendMessage(remoteJid, { text: "❌ Eu não posso me auto-banir.", quoted: msg });
    }

    // Verificar se o alvo é o dono (config.js)
    const donoJid = config.dono.numero.replace(/\D/g, "") + "@s.whatsapp.net";
    if (targetJid === donoJid) {
      return await sock.sendMessage(remoteJid, { text: "❌ Operação negada: O dono do bot é imune.", quoted: msg });
    }

    // =========================
    // 🚀 EXECUTAR BAN
    // =========================
    try {
      await sock.groupParticipantsUpdate(remoteJid, [targetJid], "remove");
      
      await sock.sendMessage(remoteJid, { react: { text: "✈️", key: msg.key } });
      await sock.sendMessage(remoteJid, { text: "✅ Usuário removido com sucesso.", quoted: msg });
    } catch (err) {
      console.error("Erro ao banir:", err);
      await sock.sendMessage(remoteJid, { text: "❌ Falha ao remover o usuário. Verifique minhas permissões.", quoted: msg });
    }
  }
};
