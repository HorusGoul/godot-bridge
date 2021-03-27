import type { Plugin, ViteDevServer } from 'vite';

export default function godotBridgePlugin(): Plugin {
  let server: ViteDevServer;

  return {
    name: 'godot-bridge',

    configureServer(_server) {
      server = _server;

      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.originalUrl === '/__godot_refresh') {
          server.ws.send({
            type: 'custom',
            event: 'godot-update',
          });

          res.statusCode = 200;
          res.end();
          return;
        }

        next();
      });
    },
  };
}
