import React from "react";
import { useBridge } from "./BridgeContext";

declare module "godot-bridge" {
  interface GodotBridgeMessages {
    "set-color": string;
  }
}

function App() {
  const bridge = useBridge();

  return (
    <div
      style={{
        color: "white",
        padding: 24,
        margin: 12,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        width: 200,
      }}
    >
      <label htmlFor="colorPicker" style={{ paddingBottom: 8 }}>
        Pick a color for the square:
      </label>

      <input
        id="colorPicker"
        defaultValue="#0000FF"
        type="color"
        onChange={(e) => {
          bridge.send({
            type: "set-color",
            payload: e.target.value,
          });
        }}
      />
    </div>
  );
}

export default App;
