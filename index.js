import path from "path";
import readline from "readline";
import P from "pino";
import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import handleCommands from "./handleCommands.js";

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(text, answer => {
      rl.close();
      resolve(answer);
    });
  });
};

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve("./auth")
  );

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // ✅ PEDIR NÚMERO + GERAR CÓDIGO (fluxo correto)
  if (!sock.authState.creds.registered) {
    let number = await question("Informe seu número (ex: 5511999999999): ");
    number = number.replace(/\D/g, "");

    if (!number) {
      console.log("❌ Número inválido");
      process.exit(1);
    }

    const code = await sock.requestPairingCode(number);
    console.log("📲 Código de pareamento:", code);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ BOT CONECTADO COM SUCESSO!");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) connect();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    handleCommands(sock, msg);
  });
}

connect();
