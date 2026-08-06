// Vercel entry point — the Node.js runtime imports this file's default export and invokes it as
// a request handler per-request. Express apps are directly callable as (req, res) => void, so
// re-exporting the app built in server.ts works as-is; server.ts itself never calls app.listen()
// when running on Vercel (guarded via process.env.VERCEL — see the bottom of that file).
export { default } from '../server';
