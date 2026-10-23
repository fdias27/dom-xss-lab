// EXERCISE: this implementation is intentionally vulnerable.
// Replace only renderComment in public/lab.mjs with this function, then run npm run test:exercise,
// and fix the sink so every comment is displayed as literal text.
export function renderComment(target, comment) {
  target.innerHTML = comment;
}
