import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { runInNewContext } from 'node:vm';
import { openapiRouter } from '../src/server/openapi.js';

test('documentation serves local assets and initializes with valid bundle presets', async () => {
  const app = express();
  app.use(openapiRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/docs`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(!html.includes('cdn.jsdelivr.net'));
    for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'kedata-docs.css']) {
      const response = await fetch(`${base}/docs/assets/${asset}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type')!, asset.endsWith('.css') ? /css/ : /javascript/);
      assert.ok((await response.text()).length > 0);
    }
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    let config: any;
    const preset = () => {};
    const bundle = Object.assign((options: unknown) => { config = options; }, { presets: { apis: preset } });
    const window: any = {};
    runInNewContext(script, { window, SwaggerUIBundle: bundle });
    window.onload();
    assert.equal(config.presets.length, 1);
    assert.equal(config.presets[0], preset);
    assert.equal(config.validatorUrl, null);
    const spec = await fetch(`${base}${config.url}`);
    assert.equal((await spec.json()).openapi, '3.0.3');

    const fallback = { innerHTML: '' };
    runInNewContext(script, { window, document: { getElementById: () => fallback } });
    window.onload();
    assert.match(fallback.innerHTML, /role="alert"/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
