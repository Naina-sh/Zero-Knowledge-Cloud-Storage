
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cwd = 'c:\\Users\\naina\\OneDrive\\Desktop\\Himanshu_project\\frontend';
const outFile = path.join(cwd, 'tsc_result.txt');
try { fs.unlinkSync(outFile); } catch {}
const out = fs.openSync(outFile, 'w');
const child = spawn(process.execPath, ['node_modules/typescript/bin/tsc','--noEmit','--skipLibCheck'], { cwd, detached: true, stdio: ['ignore', out, out] });
child.unref();
process.exit(0);