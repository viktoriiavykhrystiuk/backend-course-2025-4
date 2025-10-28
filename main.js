#!/usr/bin/env node
import { Command } from "commander";
import http from "http";
import { promises as fs } from "fs";
import path from "path";

// --- Налаштування Commander ---
const program = new Command();

program
  .requiredOption("-i, --input <path>", "шлях до JSON файлу")
  .requiredOption("-h, --host <host>", "адреса сервера")
  .requiredOption("-p, --port <port>", "порт сервера");

// --- Кастомний обробник помилок ---
program.configureOutput({
  writeErr: (str) => {
    const msg = str.trim();

    if (msg.includes("required option '-i, --input <path>'")) {
      console.error("❌ Please, specify input file (-i або --input)");
    } else if (msg.includes("required option '-h, --host <host>'")) {
      console.error("❌ Please, specify host (-h або --host)");
    } else if (msg.includes("required option '-p, --port <port>'")) {
      console.error("❌ Please, specify port (-p або --port)");
    } else {
      console.error(msg);
    }

    process.exit(1); // Завершуємо програму після помилк
  },
});

program.parse(process.argv);
const options = program.opts();

// --- Перевірка наявності файлу ---
try {
  await fs.access(options.input);
} catch {
  console.error("❌ Cannot find input file");
  process.exit(1);
}

// --- Зчитування JSON-файлу ---
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Error reading or parsing JSON:", err.message);
    process.exit(1);
  }
}

// --- Створення HTTP-сервера ---
const server = http.createServer(async (req, res) => {
  try {
    const data = await readJsonFile(options.input);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Internal Server Error:", err.message);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

// --- Запуск сервера ---
server.listen(options.port, options.host, () => {
  console.log(`✅ Server running at http://${options.host}:${options.port}/`);
  console.log(`📂 Reading data from: ${options.input}`);
});
