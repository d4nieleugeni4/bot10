import fs from "fs";
import path from "path";
import config from "./config.js";

const comandos = new Map();

// 📥 CARREGAR TODOS OS COMANDOS
const comandosPath = path.resolve("./comandos");
const arquivos = fs.readdirSync(comandosPath).filter(f => f.endsWith(".js"));

for (const arquivo of arquivos) {
  const { default: comando } = await import(`./comandos/${arquivo}`);
  comandos.set(comando.nome, comando);
}

export default async function handleCommands(sock, msg) {
  const from = msg.key.remoteJid;

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text;

  if (!text) return;

  const prefixo = config.prefixo;
  let conteudo = text.trim().toLowerCase();

  // 🔹 TRATAR PREFIXO
  if (prefixo) {
    if (!conteudo.startsWith(prefixo)) return;
    conteudo = conteudo.slice(prefixo.length).trim();
  }

  const comandoNome = conteudo.split(" ")[0];
  const comando = comandos.get(comandoNome);

  if (!comando) return;

  try {
    await comando.executar(sock, msg);
  } catch (err) {
    console.error("Erro ao executar comando:", err);
  }
}
