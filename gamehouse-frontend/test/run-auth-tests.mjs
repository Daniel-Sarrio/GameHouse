import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';

const output = fileURLToPath(new URL('../tmp/auth.test.mjs', import.meta.url));
try {
  await build({
    entryPoints: [fileURLToPath(new URL('./auth.test.ts', import.meta.url))],
    outfile: output,
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    target: 'node22',
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
  });
  const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(output, { force: true });
}
