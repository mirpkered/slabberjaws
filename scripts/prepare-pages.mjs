import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "slabberjaws";
const basePath = `/${repository}`;
const outputDirectory = new URL("../dist/pages/", import.meta.url);
const clientDirectory = new URL("../dist/client/", import.meta.url);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const server = spawn(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    "dist/server/wrangler.json",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    "8787",
    "--inspector-port",
    "0",
  ],
  { cwd: new URL("../", import.meta.url), stdio: "ignore" },
);

try {
  let response;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      response = await fetch("http://127.0.0.1:8787/");
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!response?.ok) {
    throw new Error("The production server did not become ready for the Pages snapshot.");
  }

  const html = (await response.text()).replaceAll("/_next/", `${basePath}/_next/`);
  await cp(clientDirectory, outputDirectory, { recursive: true });
  await writeFile(new URL("index.html", outputDirectory), html);
  await writeFile(new URL("404.html", outputDirectory), html);
  await writeFile(new URL(".nojekyll", outputDirectory), "");
} finally {
  server.kill();
}
