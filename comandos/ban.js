import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    if (!remoteJid.endsWith("@g.us")) return;

    // 📋 Pegar metadados atualizados para garantir que o cache não está velho
    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    // 🛠️ Função para limpar ABSOLUTAMENTE tudo (deixa apenas numero@s.whatsapp.net)
    const extra LimparJid = (jid) => {
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
    // 🚀 EXECUTAR REMOÇÃO (Direto)
    // =========================
    try {
      // O WhatsApp exige um array de JIDs LIMPOS
      await sock.groupParticipantsUpdate(remoteJid, [targetJid], "remove");
      
      await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      // Se cair aqui com erro 500, o bot DEFINITIVAMENTE não é admin no grupo
      console.error("Erro interno do servidor WhatsApp:", err.message);
      await sock.sendMessage(remoteJid, { 
        text: "❌ O WhatsApp recusou o comando. Verifique se o Bot é Administrador do grupo.", 
        quoted: msg 
      });
    }
  }
};
