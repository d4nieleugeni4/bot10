import config from "../config.js";

export default {
  nome: "ban",

  async executar(sock, msg) {
    const remoteJid = msg.key.remoteJid;

    // 1. Verifica se é grupo
    if (!remoteJid.endsWith("@g.us")) return;

    // Função vital para limpar o ID (evita bugs de comparação)
    const getCleanJid = (jid) => {
      if (!jid) return null;
      return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net';
    };

    const sender = getCleanJid(msg.key.participant || msg.key.remoteJid);

    // 2. Verifica Admin (Lógica simplificada igual ao exemplo)
    const metadata = await sock.groupMetadata(remoteJid);
    const isAdmin = metadata.participants.some(p => 
      getCleanJid(p.id) === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!isAdmin) {
      return await sock.sendMessage(remoteJid, { 
        text: '⚠️ Você precisa ser admin para banir alguém!', 
        quoted: msg 
      });
    }

    // 3. Identificar o Alvo e Delay
    let target = null;
    let delay = 0;

    const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const args = texto.split(' ').slice(1); // Remove o comando ".ban"

    // A. Por Menção (@)
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned && mentioned.length > 0) {
      target = getCleanJid(mentioned[0]);
    }
    // B. Por Resposta (Reply)
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target = getCleanJid(msg.message.extendedTextMessage.contextInfo.participant);
    }
    // C. Por Número digitado (ex: .ban 551199999999)
    else if (args[0] && args[0].match(/^\d+$/)) {
      target = args[0] + "@s.whatsapp.net";
    }

    // 4. Verifica Delay (ex: 5s) - Igual ao seu exemplo
    // Procura nos argumentos algo que termine com 's' (ex: 5s, 10s)
    const delayArg = args.find(arg => arg.match(/^\d+s$/));
    if (delayArg) {
      delay = parseInt(delayArg.replace('s', '')) * 1000;
    }

    if (!target) {
      return await sock.sendMessage(remoteJid, { 
        text: '⚠️ Você precisa mencionar (@user), responder uma mensagem ou digitar o número!', 
        quoted: msg 
      });
    }

    // Proteção básica (para não banir o dono nem a si mesmo)
    if (target === sender) return; 
    if (target === getCleanJid(sock.user.id)) return;

    // 5. Função de Banir
    const executeBan = async () => {
      try {
        await sock.groupParticipantsUpdate(remoteJid, [target], "remove");
        await sock.sendMessage(remoteJid, { 
          text: `✅ Usuário banido com sucesso!` 
        });
      } catch (err) {
        console.error(err);
        await sock.sendMessage(remoteJid, { 
          text: '❌ Erro ao banir (verifique se eu sou admin do grupo).', 
          quoted: msg 
        });
      }
    };

    // 6. Executa com ou sem Delay
    if (delay > 0) {
      await sock.sendMessage(remoteJid, { 
        text: `⏳ Banindo em ${delay/1000} segundos...`, 
        quoted: msg 
      });
      setTimeout(executeBan, delay);
    } else {
      await executeBan();
    }
  }
};
