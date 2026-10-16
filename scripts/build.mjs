import { mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const target = path.resolve(root, 'dist');
if (target !== path.join(root, 'dist')) throw new Error('Unexpected build target');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const name of ['index.html', 'styles.css', 'motion.css', 'app.js', 'motion.js', 'career-model.js', 'favicon.svg', 'data']) await cp(path.join(root, name), path.join(target, name), { recursive: true });
console.log('Built static site in dist/');
