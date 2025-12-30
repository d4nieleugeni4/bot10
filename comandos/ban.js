import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ Apenas grupo
    if (!remoteJid.endsWith("@g.us")) return;

    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    const sender = msg.key.participant;

    // 👑 Verificar se quem usou é admin
    const isAdmin = participants.some(
      p =>
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

    // 🤖 Verificar se o bot é admin
    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const botIsAdmin = participants.some(
      p =>
        p.id === botId &&
        (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!botIsAdmin) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Eu preciso ser administrador para remover alguém.",
        quoted: msg
      });
      return;
    }

    // 👤 Quem será removido
    let target;

    // 📌 Se respondeu uma mensagem
    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target =
        msg.message.extendedTextMessage.contextInfo.participant +
        "@s.whatsapp.net";
    }

    // 📌 Se marcou alguém
    if (!target && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    if (!target) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Marque alguém ou responda uma mensagem para banir.",
        quoted: msg
      });
      return;
    }

    // ❌ Não pode banir a si mesmo
    if (target === sender) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode se remover.",
        quoted: msg
      });
      return;
    }

    // ❌ Não pode banir o bot
    if (target === botId) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode me remover.",
        quoted: msg
      });
      return;
    }

    // ❌ Não pode banir o dono
    if (target.replace(/\D/g, "") === config.dono.numero) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode remover o dono do bot.",
        quoted: msg
      });
      return;
    }

    // 🚫 REMOVER
    await sock.groupParticipantsUpdate(
      remoteJid,
      [target],
      "remove"
    );

    // ✅ Reação de sucesso
    await sock.sendMessage(remoteJid, {
      react: {
        text: "✅",
        key: msg.key
      }
    });

    await sock.sendMessage(remoteJid, {
      text: "✅ Membro removido com sucesso!"
    });
  }
};
