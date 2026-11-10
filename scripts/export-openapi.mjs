import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Exports the OpenAPI specs and docs assets into public/ so Vercel can serve
// them as static files (no serverless involvement). Run automatically as part
// of the Vercel build command; also safe to run locally.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, '.cache', 'vercel-build');
fs.mkdirSync(cacheDir, { recursive: true });

async function loadTs(entry, name) {
  const outfile = path.join(cacheDir, `${name}.mjs`);
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  return import('file:///' + outfile.replaceAll('\\', '/'));
}

const { openapiSpec } = await loadTs(path.join(root, 'src/server/openapi.ts'), 'openapi');
fs.writeFileSync(path.join(root, 'public/openapi.json'), JSON.stringify(openapiSpec, null, 2) + '\n');

const { accessOpenapiSpec } = await loadTs(path.join(root, 'src/server/access-openapi.ts'), 'admin-openapi');
fs.writeFileSync(path.join(root, 'public/admin-openapi.json'), JSON.stringify(accessOpenapiSpec, null, 2) + '\n');

const require = createRequire(import.meta.url);
const swaggerDir = path.dirname(require.resolve('swagger-ui-dist/package.json'));
const assetsDir = path.join(root, 'public/docs/assets');
fs.mkdirSync(assetsDir, { recursive: true });
for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js']) {
  fs.copyFileSync(path.join(swaggerDir, asset), path.join(assetsDir, asset));
}
fs.copyFileSync(path.join(root, 'public/kedata-docs.css'), path.join(assetsDir, 'kedata-docs.css'));
console.log('public/openapi.json, public/admin-openapi.json dan public/docs/assets siap.');
