import { readFile, writeFile } from 'node:fs/promises';

const mode = process.argv[2];
if (!['start', 'reset'].includes(mode)) {
  console.error('Usage: node scripts/exercise.mjs start|reset');
  process.exitCode = 1;
} else {
  const labFile = new URL('../public/lab.mjs', import.meta.url);
  const sourceFile = new URL(`../exercises/comment-renderer.${mode === 'start' ? 'starter' : 'solution'}.mjs`, import.meta.url);
  const pattern = /export function renderComment\(target, comment\) \{[\s\S]*?\n\}/;
  const [lab, source] = await Promise.all([readFile(labFile, 'utf8'), readFile(sourceFile, 'utf8')]);
  const replacement = source.match(pattern)?.[0];
  if (!pattern.test(lab) || !replacement) {
    throw new Error('Expected renderComment signature not found. Restore that function manually; no file was changed.');
  }
  await writeFile(labFile, lab.replace(pattern, () => replacement));
  console.log(mode === 'start'
    ? 'Vulnerable exercise loaded. Exercise tests should now fail. Reload the app to inspect the third preview.'
    : 'Working solution restored. Run npm test and reload the app.');
}
