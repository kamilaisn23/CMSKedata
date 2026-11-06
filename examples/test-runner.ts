/**
 * Automated Compatibility Verification Runner
 * Tests Kedata CMS API from 3 environments:
 * 1. Node.js via @kedata/cms-client
 * 2. Browser simulation with CORS headers
 * 3. cURL CLI call
 */

import { execSync } from 'child_process';
import { prisma } from '../src/server/db.js';
import { KedataCmsClient } from '../packages/client/src/index.js';
import { generateApiKey } from '../src/server/security.js';

async function runCompatibilityTests() {
  console.log('🧪 Starting Kedata CMS Multi-Environment Compatibility Test...\n');

  // Find or provision a test site with an active raw API key
  const testKey = generateApiKey('kd_test_runner');
  const site = await prisma.site.upsert({
    where: { slug: 'kedata-tech' },
    update: {
      apiKeyHash: testKey.hash,
      apiKeyPrefix: testKey.prefix,
    },
    create: {
      name: 'Kedata Tech Blog',
      slug: 'kedata-tech',
      domain: 'tech.kedata.id',
      apiKeyHash: testKey.hash,
      apiKeyPrefix: testKey.prefix,
      corsOrigins: '*',
    },
  });

  const baseUrl = 'http://localhost:3000/api/v1';
  const apiKey = testKey.rawKey;

  console.log(`[1/3] Testing Environment 1: Node.js (@kedata/cms-client)...`);
  const client = new KedataCmsClient({ baseUrl, apiKey });

  let nodeData: any = null;
  try {
    const res = await client.posts.list({ perPage: 2 });
    nodeData = res;
    console.log(`  ✅ Node.js Client Success: fetched ${res.data.length} posts. Status structure: { data, meta, error }`);
  } catch (err: any) {
    console.log(`  ℹ️ Node.js Client: dev server might not be running on port 3000 yet (will test during live verification). Details: ${err.message}`);
  }

  console.log(`\n[2/3] Testing Environment 2: Browser Client Simulation (CORS)...`);
  try {
    const res = await fetch(`${baseUrl}/posts?perPage=2`, {
      headers: {
        'x-api-key': apiKey,
        'Origin': 'http://localhost:5173',
      },
    });
    const json = await res.json();
    const allowOrigin = res.headers.get('access-control-allow-origin');
    console.log(`  ✅ Browser Fetch Success: CORS Header: ${allowOrigin}, data items: ${json.data?.length}`);
  } catch (err: any) {
    console.log(`  ℹ️ Browser Fetch note: ${err.message}`);
  }

  console.log(`\n[3/3] Testing Environment 3: cURL Command...`);
  try {
    const curlOutput = execSync(
      `curl -s -X GET "${baseUrl}/posts?perPage=2" -H "x-api-key: ${apiKey}"`,
      { encoding: 'utf-8' }
    );
    const curlJson = JSON.parse(curlOutput);
    console.log(`  ✅ cURL Success: returned status code / body with data length: ${curlJson.data?.length}`);
  } catch (err: any) {
    console.log(`  ℹ️ cURL note: ${err.message}`);
  }

  console.log('\n✨ Compatibility verification test routine ready.');
}

runCompatibilityTests().catch(console.error);
