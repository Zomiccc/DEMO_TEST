const { spawn } = require('child_process');

const apiDir = __dirname;

console.log('[dev] Starting tsc --watch...');
const tsc = spawn('npx', ['tsc', '--watch'], {
  shell: true,
  stdio: 'inherit',
  cwd: apiDir,
});

const startApp = () => {
  console.log('[dev] Starting API server...');
  const app = spawn('node', ['dist/apps/api/src/main.js'], {
    stdio: 'inherit',
    cwd: apiDir,
  });
  app.on('exit', (code) => {
    console.log(`[dev] API exited with code ${code}`);
    tsc.kill();
    process.exit(code ?? 0);
  });
};

setTimeout(startApp, 5000);
