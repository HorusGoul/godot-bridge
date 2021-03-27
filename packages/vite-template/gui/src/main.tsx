import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { setupEngineAndBridge } from "godot-bridge";
import { BridgeContext } from "./BridgeContext";

async function main() {
  const result = await setupEngineAndBridge();

  if (!result) {
    return;
  }

  const { bridge, engine } = result;

  if (import.meta.hot) {
    import.meta.hot?.on("godot-update", async () => {
      engine.requestQuit();

      bridge.teardown();
      await bridge.setup();

      await engine.startGame();
    });
  }

  ReactDOM.render(
    <React.StrictMode>
      <BridgeContext.Provider value={bridge}>
        <App />
      </BridgeContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
  );
}

main();
