import fs from 'fs-extra';
import path from 'path';

const publicDir = path.resolve('public');
const outDir = path.resolve('dist');

await fs.remove(outDir);
await fs.ensureDir(outDir);

await fs.copy(publicDir, outDir);
console.log('Built dashboard to', outDir);
