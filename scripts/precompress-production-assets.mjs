import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  brotliCompress,
  constants as zlibConstants,
  gzip
} from "node:zlib";
import { promisify } from "node:util";

const brotliCompressAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const searchIndexDirectory = resolve(
  fileURLToPath(new URL("../dist/client/search-index/", import.meta.url))
);
const jsonFiles = await findJsonFiles(searchIndexDirectory);

if (jsonFiles.length === 0) {
  throw new Error(`No search-index JSON files found in ${searchIndexDirectory}`);
}

let rawBytes = 0;
let brotliBytes = 0;
let gzipBytes = 0;

await mapWithConcurrency(jsonFiles, 4, async (filePath) => {
  const source = await readFile(filePath);
  const [brotliResult, gzipResult] = await Promise.all([
    brotliCompressAsync(source, {
      params: {
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: source.byteLength
      }
    }),
    gzipAsync(source, { level: 9 })
  ]);

  await Promise.all([
    writeFile(`${filePath}.br`, brotliResult),
    writeFile(`${filePath}.gz`, gzipResult)
  ]);

  rawBytes += source.byteLength;
  brotliBytes += brotliResult.byteLength;
  gzipBytes += gzipResult.byteLength;
});

console.log(
  `Precompressed ${jsonFiles.length} search-index JSON files: ` +
    `${rawBytes} raw bytes, ${brotliBytes} Brotli bytes, ${gzipBytes} gzip bytes.`
);

async function findJsonFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function mapWithConcurrency(values, concurrency, operation) {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (index < values.length) {
        const value = values[index];
        index += 1;
        await operation(value);
      }
    }
  );
  await Promise.all(workers);
}
