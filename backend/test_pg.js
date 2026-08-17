const fs = require('fs');
const p = 'c:\\Users\\naina\\OneDrive\\Desktop\\Himanshu_project\\frontend\\node_modules\\@xenova\\transformers\\dist\\transformers.js';
const src = fs.readFileSync(p, 'utf8');
console.log('File size:', (src.length/1024).toFixed(0), 'KB');
console.log('Starts with export:', src.startsWith('export'));
console.log('First 200 chars:', src.slice(0, 200));
// Check for pipeline and env exports
console.log('Has "export {":', src.includes('export {'));
console.log('Has pipeline export:', /export\s*{[^}]*\bpipeline\b/.test(src) || src.includes('pipeline'));
console.log('Has env export:', src.includes('\benv\b') || /export\s*{[^}]*\benv\b/.test(src));
// Look for the export statement
const m = src.match(/export\s*\{[^}]*\}/);
console.log('Export statement:', m ? m[0].slice(0, 300) : 'not found');
