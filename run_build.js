const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cwd = 'c:\\Users\\naina\\OneDrive\\Desktop\\Himanshu_project\\frontend';
const outFile = path.join(cwd, 'build_result.txt');
try { fs.unlinkSync(outFile); } catch {}
const out = fs.openSync(outFile, 'w');
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd, detached: true, stdio: ['ignore', out, out] });
child.unref();
process.exit(0);



