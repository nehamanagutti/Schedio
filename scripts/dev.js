const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name, cwd, args) {
  const child = spawn(npm, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    // npm.cmd is a Windows batch file. Node cannot spawn it directly with
    // shell disabled on recent Windows/Node versions (it throws EINVAL).
    shell: process.platform === 'win32'
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${name} stopped by ${signal}`);
      return;
    }
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

const children = [
  run('backend', 'backend', ['run', 'dev']),
  run('frontend', 'frontend', ['run', 'dev'])
];

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on('SIGINT', () => {
  stop();
  process.exit();
});

process.on('SIGTERM', () => {
  stop();
  process.exit();
});
