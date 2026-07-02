import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app } from './api/index.js';

// Local-only dev bootstrapping. Kept out of api/index.ts because Vite pulls in
// build-time tooling (esbuild's native binary, rollup, chokidar) that Vercel's
// Node.js serverless runtime cannot load, causing FUNCTION_INVOCATION_FAILED.
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Community Hero] Local dev environment up on http://localhost:${PORT}`);
  });
}

startServer();
