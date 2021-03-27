import type { Plugin, ViteDevServer } from 'vite';
import type { GodotBridge } from 'godot-bridge';

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

export function configureGodotBridgeViteClient({
  bridge,
  engine,
}: {
  bridge: GodotBridge;
  engine: Engine;
}): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (import.meta.hot) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    import.meta.hot?.on('godot-update', async () => {
      engine.requestQuit();

      bridge.teardown();
      await bridge.setup();

      await engine.startGame();
    });
  }
}
