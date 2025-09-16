/*
 * HSM SDK Connectivity & Capability Check (non-destructive)
 *
 * Goal: Validate whether the Dinamo HSM JavaScript SDK can be loaded in Node/NestJS
 * and whether a basic connection succeeds without mTLS. It also inspects available
 * modules (partitions, keys, sign, svault, shamir) and optionally performs very
 * small read-only calls if present. By default, this script is safe and will not
 * attempt any destructive operations or key creation.
 *
 * Usage:
 *   # Ensure env vars are set (no mTLS)
 *   export HSM_HOST=187.33.9.132
 *   export HSM_PORT=4433
 *   export HSM_USER=demoale
 *   export HSM_PASS=12345678
 *   export HSM_PARTITION=DEMO
 *   export HSM_TIMEOUT=30000
 *   # Optional: pointer to non-public registry package, otherwise dynamic import may fail
 *   # export NODE_OPTIONS=... (if needed)
 *
 *   npm run hsm:sdk:check
 *
 * Notes:
 *  - This script uses dynamic import to support both ESM and CJS SDK distributions.
 *  - If the SDK package is not available in the current registry, it will report
 *    a clear error. Configure your .npmrc to the vendor's registry before running.
 */

import type { IncomingMessage } from 'http';

type AnyObj = Record<string, any>;

async function dynamicImportSdk(): Promise<AnyObj> {
  // Try common names and interop shapes; adjust as vendor confirms package name
  const candidates = [
    '@dinamonetworks/hsm-dinamo', // commonly referenced in examples
    '@dinamonetworks/hsm-client', // alternate guess
    '@dinamonetworks/hsm',        // alternate guess
  ];

  for (const name of candidates) {
    try {
      const mod: AnyObj = await import(name);
      return { name, mod };
    } catch (e) {
      // keep trying
    }
  }

  // As a last resort, try CJS require via createRequire if running under CommonJS
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRequire } = require('module');
    const req = createRequire(__filename);
    const name = '@dinamonetworks/hsm-dinamo';
    const mod = req(name);
    return { name, mod };
  } catch {}

  throw new Error(
    'Dinamo HSM SDK not found in the current environment.\n' +
      'Configure your .npmrc to point to the vendor registry (or install a tarball/git URL) and try again.\n' +
      'Expected package names tried: @dinamonetworks/hsm-dinamo, @dinamonetworks/hsm-client, @dinamonetworks/hsm',
  );
}

async function main() {
  const host = process.env.HSM_HOST || '127.0.0.1';
  const port = Number(process.env.HSM_PORT || 4433);
  const user = process.env.HSM_USER || 'user';
  const password = process.env.HSM_PASS || 'pass';
  const partition = process.env.HSM_PARTITION || 'DEFAULT';
  const timeout = Number(process.env.HSM_TIMEOUT || 30000);

  console.log('🔍 HSM SDK connectivity check starting...');
  console.log('  - Host:', host);
  console.log('  - Port:', port);
  console.log('  - Partition:', partition);
  console.log('  - Timeout:', timeout);

  // Load SDK dynamically
  const { name, mod } = await dynamicImportSdk();
  console.log(`📦 SDK module loaded: ${name}`);

  // Resolve the SDK root (support default export shapes)
  const sdkRoot: AnyObj = mod?.hsm || mod?.default?.hsm || mod?.default || mod;
  if (!sdkRoot) {
    throw new Error('SDK module does not expose an hsm root export');
  }

  if (typeof sdkRoot.connect !== 'function') {
    throw new Error('SDK does not expose a connect(options) function');
  }

  // Connect without mTLS (as requested)
  console.log('🔌 Connecting to HSM (no mTLS)...');
  const client: AnyObj = await sdkRoot.connect({
    host,
    port,
    user,
    password,
    partition,
    timeout,
  });
  console.log('✅ Connected');

  // Inspect capabilities (non-destructive)
  const capabilities = {
    partitions: !!client?.partitions,
    keys: !!client?.keys,
    sign: !!client?.sign || !!client?.crypto?.sign,
    svault: !!client?.svault,
    shamir: !!client?.shamir,
    health: typeof client?.health === 'function',
    info: typeof client?.info === 'function',
  };
  console.log('🧭 Capabilities detected:', capabilities);

  // Try harmless calls if present
  try {
    if (capabilities.health) {
      const h = await client.health();
      console.log('🩺 Health:', h);
    }
  } catch (e) {
    console.warn('⚠️ health() call failed:', (e as Error).message);
  }

  try {
    if (client?.partitions?.current) {
      const pinfo = await client.partitions.current();
      console.log('📦 Current partition:', pinfo);
    }
  } catch (e) {
    console.warn('⚠️ partitions.current() failed:', (e as Error).message);
  }

  // Optionally probe Shamir API (safe listing only). To run a destructive example,
  // set HSM_SDK_RUN_SHAMIR_TEST=true and ensure the SDK supports it.
  if (process.env.HSM_SDK_RUN_SHAMIR_TEST === 'true') {
    if (client?.shamir && client?.keys) {
      try {
        // Pseudocode (adjust once SDK method names are confirmed):
        // const smk = await client.keys.createServerMasterKey({ label: `sdk_check_${Date.now()}` });
        // const shares = await client.shamir.split({ keyId: smk.id, total: 5, threshold: 3 });
        // console.log('🔑 SMK created:', smk);
        // console.log('🧩 Shamir shares:', shares);
        console.log(
          'ℹ️ Shamir API detected. For safety, this script does not create keys by default.\n' +
            '   Set HSM_SDK_RUN_SHAMIR_TEST=true and fill in exact method names to perform a full test.',
        );
      } catch (e) {
        console.warn('⚠️ Shamir test failed:', (e as Error).message);
      }
    } else {
      console.log('ℹ️ Shamir module not detected on client.');
    }
  }

  // Done
  console.log('🎯 HSM SDK connectivity check finished.');
}

main().catch((err) => {
  console.error('❌ HSM SDK check failed:', err?.message || err);
  process.exit(1);
});

