#!/usr/bin/env node
import { Command } from "commander";
import http from "http";
import { promises as fs } from "fs";
import { XMLBuilder } from "fast-xml-parser"; // ✅ ДОДАНО: Імпорт XMLBuilder

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
      console.error("❌ Please, specify input file");
    } else if (msg.includes("required option '-h, --host <host>'")) {
      console.error("❌ Please, specify host");
    } else if (msg.includes("required option '-p, --port <port>'")) {
      console.error("❌ Please, specify port");
    } else {
      console.error(msg);
    }

    process.exit(1); // Завершуємо програму після помилок
  },
});

program.parse(process.argv);

const options = program.opts();
const { input, host, port } = options;

// ✅ КОНСТАНТА: Створення екземпляра XMLBuilder поза обробником запиту
const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  suppressEmptyNode: true,
});

async function readJsonFile(filePath) { // Змінив path на filePath, щоб уникнути конфлікту
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error("Cannot find input file");
      process.exit(1);
    } else {
      console.error("Error reading file:", err);
      process.exit(1);
    }
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;

    // Перевірка існування файлу та читання даних
    const data = await readJsonFile(input);

    let filtered = data;

    // Фільтрація за max_mpg (тільки записи з mpg < X)
    if (params.has("max_mpg")) {
      const maxMpg = parseFloat(params.get("max_mpg"));
      if (!isNaN(maxMpg)) {
        // ✅ ВАЖЛИВО: Переконайтеся, що car.mpg існує та є числом
        filtered = filtered.filter(car => typeof car.mpg === 'number' && car.mpg < maxMpg);
      }
    }

    // Формування даних для XML
    const cylinders = params.get("cylinders") === "true";

    const carsXmlData = filtered.map(car => {
      // Вихідні поля для Варіанту 5: model, mpg, (cyl)
      const item = { model: car.model, mpg: car.mpg }; 
      if (cylinders) item.cyl = car.cyl;
      return item;
    });

    // Формування XML
    const xmlData = builder.build({
      cars: { car: carsXmlData },
    });

    res.writeHead(200, { "Content-Type": "application/xml" });
    res.end(xmlData);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
    console.error(err);
  }
});

// ✅ ДОДАНО: Запуск сервера
server.listen(port, host, () => {
  console.log(`✅ Server is running on http://${host}:${port}`);
  console.log(`Input file: ${input}`);
});