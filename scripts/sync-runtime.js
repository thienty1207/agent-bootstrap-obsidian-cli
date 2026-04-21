const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourceBin = path.join(repoRoot, 'bin', 'agent-bootstrap.js');
const sourceDist = path.join(repoRoot, 'dist');
const runtimeRoot = path.join(repoRoot, 'runtime', 'agent-bootstrap');
const runtimeBinDir = path.join(runtimeRoot, 'bin');
const runtimeDistDir = path.join(runtimeRoot, 'dist');

fs.mkdirSync(runtimeBinDir, { recursive: true });
fs.rmSync(runtimeDistDir, { recursive: true, force: true });

fs.copyFileSync(sourceBin, path.join(runtimeBinDir, 'agent-bootstrap.js'));
fs.cpSync(sourceDist, runtimeDistDir, { recursive: true });
