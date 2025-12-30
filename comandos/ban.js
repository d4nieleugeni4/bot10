import config from "../config.js";

export default {
  nome: "ban",
  commands: ["ban", "kick"], // Aliases para o comando

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Apenas grupos
    if (!remoteJid.endsWith("@g.us")) return;

    // 🛠️ Função para normalizar JID (ID Limpo)
    const normalizeJid = (jid) => jid.split('@')[0].split(':')[0] + '@s.whatsapp.net';

    // 📋 Metadados para verificar admins
    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    const senderJid = normalizeJid(msg.key.participant || msg.key.remoteJid);
    const botJid = normalizeJid(sock.user.id);
    const ownerNumber = config.dono.numero.replace(/\D/g, "");

    // =========================
    // 👑 VERIFICAR ADMIN
    // =========================
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => normalizeJid(p.id));

    if (!admins.includes(senderJid)) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Você precisa ser administrador para usar este comando.",
        quoted: msg
      });
    }

    // =========================
    // 👤 IDENTIFICAR ALVO
    // =========================
    let targetJid = null;

    // 1. Por resposta (quoted)
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    
    // 2. Por menção (mention)
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (quotedParticipant) {
      targetJid = normalizeJid(quotedParticipant);
    } else if (mentioned && mentioned.length > 0) {
      targetJid = normalizeJid(mentioned[0]);
    }

    // Validação de presença de alvo
    if (!targetJid) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Você precisa mencionar alguém ou responder a uma mensagem!",
        quoted: msg
      });
    }

    // =========================
    // 🚫 VALIDAÇÕES DE SEGURANÇA
    // =========================
    if (targetJid === senderJid) {
      return await sock.sendMessage(remoteJid, { text: "❌ Você não pode remover você mesmo!", quoted: msg });
    }

    if (targetJid === botJid) {
      return await sock.sendMessage(remoteJid, { text: "❌ Você não pode me remover!", quoted: msg });
    }

    if (targetJid.includes(ownerNumber)) {
      return await sock.sendMessage(remoteJid, { text: "❌ Você não pode remover o dono do bot!", quoted: msg });
    }

    // =========================
    // 🚀 EXECUÇÃO
    // =========================
    try {
      await sock.groupParticipantsUpdate(remoteJid, [targetJid], "remove");

      await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
      await sock.sendMessage(remoteJid, { text: "Membro removido com sucesso!", quoted: msg });
      
    } catch (err) {
      console.error("Erro ao banir:", err);
      await sock.sendMessage(remoteJid, { 
        text: "❌ Falha ao remover. Certifique-se de que eu sou administrador.", 
        quoted: msg 
      });
    }
  }
};
