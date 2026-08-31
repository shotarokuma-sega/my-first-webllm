import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "public", "models-v3");
const dryRun = process.argv.includes("--dry-run");
const models = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    repository: "mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    wasmUrl:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    repository: "mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC",
    wasmUrl:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2.5-3B-Instruct-q4f16_1_cs1k-webgpu.wasm",
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    repository: "mlc-ai/Qwen3-4B-q4f16_1-MLC",
    wasmUrl:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen3-4B-q4f16_1_cs1k-webgpu.wasm",
  },
];

async function fileSize(filePath) {
  try {
    return (await stat(filePath)).size;
  } catch {
    return 0;
  }
}

async function download(url, destination, expectedSize) {
  const existingSize = await fileSize(destination);
  let remoteSize = expectedSize;
  if (!remoteSize && existingSize > 0) {
    const headResponse = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    const contentLength = Number(headResponse.headers.get("content-length"));
    if (
      headResponse.ok &&
      Number.isFinite(contentLength) &&
      contentLength > 0
    ) {
      remoteSize = contentLength;
    }
  }

  if (remoteSize && existingSize === remoteSize) {
    console.log(`skip ${path.relative(root, destination)}`);
    return;
  }
  if (dryRun) {
    console.log(`would download ${url}`);
    return;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const canResume =
    existingSize > 0 && (!remoteSize || existingSize < remoteSize);
  const response = await fetch(url, {
    redirect: "follow",
    headers: canResume ? { Range: `bytes=${existingSize}-` } : {},
  });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const append = canResume && response.status === 206;
  if (!append && existingSize > 0) await unlink(destination);
  console.log(
    `${append ? "resume" : "download"} ${path.relative(root, destination)}`,
  );
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destination, { flags: append ? "a" : "w" }),
  );

  if (remoteSize && (await fileSize(destination)) !== remoteSize) {
    throw new Error(`Size mismatch: ${destination}`);
  }
}

async function downloadModel(model) {
  const apiUrl = `https://huggingface.co/api/models/${model.repository}/tree/main?recursive=true&expand=false`;
  const response = await fetch(apiUrl);
  if (!response.ok)
    throw new Error(`Could not list ${model.repository}: ${response.status}`);
  const entries = await response.json();
  const files = entries.filter(
    (entry) =>
      entry.type === "file" &&
      ![".gitattributes", "README.md"].includes(entry.path),
  );
  const modelDir = path.join(outputRoot, model.id, "resolve", "main");

  console.log(`\n${model.id}: ${files.length} files`);
  for (const file of files) {
    const source = `https://huggingface.co/${model.repository}/resolve/main/${file.path}`;
    await download(source, path.join(modelDir, file.path), file.size);
  }
  await download(model.wasmUrl, path.join(outputRoot, model.id, "model.wasm"));
}

for (const model of models) await downloadModel(model);
console.log(`\nLocal WebLLM models are ready in ${outputRoot}`);
