import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Apenas grupos
    if (!remoteJid.endsWith("@g.us")) return;

    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    const sender = msg.key.participant;

    // =========================
    // 👑 VERIFICAR SE USUÁRIO É ADMIN
    // =========================
    const isAdmin = participants.some(p => {
      const pNumber = p.id.replace(/\D/g, "");
      const senderNumber = sender.replace(/\D/g, "");
      return (
        pNumber === senderNumber &&
        (p.admin === "admin" || p.admin === "superadmin")
      );
    });

    if (!isAdmin) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Apenas administradores podem usar este comando.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🤖 VERIFICAR SE O BOT É ADMIN (CORRETO)
    // =========================
    const botNumber = sock.user.id.split(":")[0].replace(/\D/g, "");

    const botIsAdmin = participants.some(p => {
      const pNumber = p.id.replace(/\D/g, "");
      return (
        pNumber === botNumber &&
        (p.admin === "admin" || p.admin === "superadmin")
      );
    });

    if (!botIsAdmin) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Eu preciso ser administrador para remover alguém.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 👤 DEFINIR ALVO (MENÇÃO OU RESPOSTA)
    // =========================
    let target = null;

    // Se respondeu uma mensagem
    const quotedParticipant =
      msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (quotedParticipant) {
      target = quotedParticipant.includes("@")
        ? quotedParticipant
        : quotedParticipant + "@s.whatsapp.net";
    }

    // Se marcou alguém
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!target && mentioned && mentioned.length > 0) {
      target = mentioned[0];
    }

    if (!target) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Marque alguém ou responda uma mensagem para banir.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🚫 VALIDAÇÕES
    // =========================
    const targetNumber = target.replace(/\D/g, "");
    const senderNumber = sender.replace(/\D/g, "");

    // Não pode se banir
    if (targetNumber === senderNumber) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode se remover.",
        quoted: msg
      });
      return;
    }

    // Não pode banir o bot
    if (targetNumber === botNumber) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode me remover.",
        quoted: msg
      });
      return;
    }

    // Não pode banir o dono
    if (targetNumber === config.dono.numero.replace(/\D/g, "")) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode remover o dono do bot.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🚫 REMOVER MEMBRO
    // =========================
    await sock.groupParticipantsUpdate(
      remoteJid,
      [target],
      "remove"
    );

    // =========================
    // ✅ REAÇÃO + CONFIRMAÇÃO
    // =========================
    await sock.sendMessage(remoteJid, {
      react: {
        text: "✅",
        key: msg.key
      }
    });

    await sock.sendMessage(remoteJid, {
      text: "✅ Membro removido com sucesso!",
      quoted: msg
    });
  }
};
