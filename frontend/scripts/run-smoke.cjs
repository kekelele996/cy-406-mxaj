const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const { dirname, join } = require('node:path');

const root = dirname(__dirname);
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
const scenarios = ['scenario-1-delete', 'scenario-2-toggle', 'scenario-3-legacy-idb'];

(async () => {
  for (const scenario of scenarios) {
    const outfile = join(root, 'scripts', `${scenario}.bundle.mjs`);
    execFileSync(
      esbuild,
      [join(root, 'scripts', `${scenario}.ts`), '--bundle', '--platform=node', '--format=esm', `--outfile=${outfile}`, '--log-level=warning'],
      { stdio: 'inherit' }
    );
    try {
      const output = execFileSync(process.execPath, [outfile], { encoding: 'utf8', cwd: root });
      process.stdout.write(output);
    } finally {
      rmSync(outfile, { force: true });
    }
  }
  console.log('all scenarios passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
