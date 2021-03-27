import { Base64 } from 'js-base64';
import { GodotBridge } from './godot-bridge';

interface GodotData {
  url: string;
  headInclude: string;
  origin: string;
  projectName: string;
  config: EngineConfig;
}

export async function setupEngineAndBridge() {
  const search = new URLSearchParams(window.location.search);
  const encodedData = search.get('godot_data');

  if (!encodedData) {
    alert('Something went wrong!');
    return;
  }

  const data: GodotData = JSON.parse(Base64.decode(encodedData));

  await loadRemoteScript(`${data.origin}/${data.url}`);

  const canvas = document.getElementById('game-root') as HTMLCanvasElement;

  const bridge = new GodotBridge({ name: 'sendChannel' });

  await bridge.setup();

  const engine = new Engine({
    canvas,
    ...data.config,
    executable: `${data.origin}/${data.config.executable}`,
  });

  await engine.startGame();

  return {
    bridge,
    engine,
  };
}

async function loadRemoteScript(src: string) {
  return new Promise<void>((resolve) => {
    const godotExportScript = document.createElement('script');
    godotExportScript.src = src;
    godotExportScript.type = 'text/javascript';
    godotExportScript.onload = () => resolve();

    document.body.append(godotExportScript);
  });
}
