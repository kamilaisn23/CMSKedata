import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Vercel's runtime loader cannot require sanitize-html's ESM parser dependency.
const require = createRequire(import.meta.url);
const entry = require.resolve('sanitize-html');
const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', write: false });
await writeFile(entry, result.outputFiles[0].contents);
