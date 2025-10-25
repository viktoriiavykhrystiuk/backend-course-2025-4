#!/usr/bin/env node
import { Command } from "commander";
import http from "http";
import { promises as fs } from "fs";
import { XMLBuilder } from "fast-xml-parser";

const program = new Command();

program
  .requiredOption("-i, --input <path>", "шлях до файлу JSON")
  .requiredOption("-h, --host <host>", "адреса сервера")
  .requiredOption("-p, --port <port>", "порт сервера");

program.parse(process.argv);

const options = program.opts();
const { input, host, port } = options;

async function readJsonFile(path) {
  try {
    const data = await fs.readFile(path, "utf-8");
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

    const data = await readJsonFile(input);

    let filtered = data;

    // Фільтрація за max_mpg (тільки записи з mpg < X)
    if (params.has("max_mpg")) {
      const maxMpg = parseFloat(params.get("max_mpg"));
      if (!isNaN(maxMpg)) {
        filtered = filtered.filter(car => car.mpg < maxMpg);
      }
    }

    // Формування даних для XML
    const cylinders = params.get("cylinders") === "true";

    const carsXmlData = filtered.map(car => {
      const item = { model: car.model, mpg: car.mpg };
      if (cylinders) item.cyl = car.cyl;
      return item;
    });

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true,
    });

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

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
