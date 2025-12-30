import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Só funciona em grupos
    if (!remoteJid.endsWith("@g.us")) return;

    // 📋 Obter dados do grupo
    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    // 🛠️ Função para limpar o ID (importante para o reconhecimento funcionar)
    const normalizeJid = (jid) => jid.split('@')[0].split(':')[0] + '@s.whatsapp.net';

    const senderJid = normalizeJid(msg.key.participant || msg.key.remoteJid);

    // =========================
    // 👑 VERIFICAR SE QUEM COMANDOU É ADMIN
    // =========================
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => normalizeJid(p.id));

    if (!admins.includes(senderJid)) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Apenas administradores podem usar este comando.",
        quoted: msg
      });
    }

    // =========================
    // 👤 DEFINIR ALVO (Target)
    // =========================
    let targetJid = null;

    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quotedParticipant) {
      targetJid = normalizeJid(quotedParticipant);
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!targetJid && mentioned?.length) {
      targetJid = normalizeJid(mentioned[0]);
    }

    if (!targetJid) {
      return await sock.sendMessage(remoteJid, {
        text: "❌ Marque alguém ou responda a uma mensagem.",
        quoted: msg
      });
    }

    // =========================
    // 🚫 REGRAS DE SEGURANÇA (Dono e Próprio Bot)
    // =========================
    const botJid = normalizeJid(sock.user.id);
    const donoJid = config.dono.numero.replace(/\D/g, "") + "@s.whatsapp.net";

    if (targetJid === donoJid || targetJid === botJid) {
      return await sock.sendMessage(remoteJid, { text: "❌ Não posso remover o dono ou a mim mesmo.", quoted: msg });
    }

    // =========================
    // 🚀 EXECUTAR REMOÇÃO
    // =========================
    try {
      await sock.groupParticipantsUpdate(remoteJid, [targetJid], "remove");
      
      await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("Erro ao banir:", err);
      await sock.sendMessage(remoteJid, { 
        text: "❌ Erro ao remover. Verifique se eu tenho as permissões necessárias.", 
        quoted: msg 
      });
    }
  }
};
