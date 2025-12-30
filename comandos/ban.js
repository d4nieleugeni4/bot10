import config from "../config.js";

function limparNumero(jid = "") {
  return jid.split("@")[0].replace(/\D/g, "");
}

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // ❌ só grupo
    if (!remoteJid.endsWith("@g.us")) return;

    const metadata = await sock.groupMetadata(remoteJid);
    const participants = metadata.participants;

    const senderJid = msg.key.participant;
    const senderNumber = limparNumero(senderJid);

    const botJid = sock.user.id;
    const botNumber = limparNumero(botJid);

    // =========================
    // 👑 LISTA REAL DE ADMINS
    // =========================
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => limparNumero(p.id));

    // =========================
    // 👑 USUÁRIO É ADMIN?
    // =========================
    if (!admins.includes(senderNumber)) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Apenas administradores podem usar este comando.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🤖 BOT É ADMIN?
    // =========================
    if (!admins.includes(botNumber)) {
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

    // resposta
    const quoted =
      msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (quoted) {
      targetJid = quoted.includes("@")
        ? quoted
        : quoted + "@s.whatsapp.net";
    }

    // menção
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!targetJid && mentioned?.length) {
      targetJid = mentioned[0];
    }

    if (!targetJid) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Marque alguém ou responda uma mensagem.",
        quoted: msg
      });
      return;
    }

    const targetNumber = limparNumero(targetJid);

    // =========================
    // 🚫 VALIDAÇÕES
    // =========================
    if (targetNumber === senderNumber) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode se remover.",
        quoted: msg
      });
      return;
    }

    if (targetNumber === botNumber) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode me remover.",
        quoted: msg
      });
      return;
    }

    if (targetNumber === limparNumero(config.dono.numero)) {
      await sock.sendMessage(remoteJid, {
        text: "❌ Você não pode remover o dono do bot.",
        quoted: msg
      });
      return;
    }

    // =========================
    // 🚫 REMOVER
    // =========================
    await sock.groupParticipantsUpdate(
      remoteJid,
      [targetJid],
      "remove"
    );

    // =========================
    // ✅ CONFIRMAÇÃO
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
