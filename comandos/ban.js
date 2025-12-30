import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    if (!remoteJid.endsWith("@g.us")) return;

    // 📋 Pegar metadados atualizados
    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    // 🛠️ Função corrigida (sem espaço no nome)
    const extraLimparJid = (jid) => {
      if (!jid) return "";
      const num = jid.split('@')[0].split(':')[0];
      return `${num}@s.whatsapp.net`;
    };

    const senderJid = extraLimparJid(msg.key.participant || msg.key.remoteJid);

    // =========================
    // 👑 VERIFICAR SE VOCÊ É ADMIN
    // =========================
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => extraLimparJid(p.id));

    if (!admins.includes(senderJid)) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Você precisa ser administrador para usar este comando.",
        quoted: msg
      });
    }

    // =========================
    // 👤 DEFINIR ALVO
    // =========================
    let targetJid = null;

    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quotedParticipant) {
      targetJid = extraLimparJid(quotedParticipant);
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!targetJid && mentioned?.length) {
      targetJid = extraLimparJid(mentioned[0]);
    }

    if (!targetJid) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Responda ou marque alguém para banir.",
        quoted: msg
      });
    }

    // =========================
    // 🚀 EXECUTAR REMOÇÃO
    // =========================
    try {
      // Removendo as restrições de segurança do bot para testar a execução direta
      await sock.groupParticipantsUpdate(remoteJid, [targetJid], "remove");
      
      await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("Erro ao banir:", err);
      await sock.sendMessage(remoteJid, { 
        text: "❌ O WhatsApp recusou o comando. Verifique se o Bot é Administrador.", 
        quoted: msg 
      });
    }
  }
};
