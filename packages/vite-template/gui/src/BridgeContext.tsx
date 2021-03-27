import { GodotBridge } from "godot-bridge";
import * as React from "react";

export const BridgeContext = React.createContext<GodotBridge>(null!);

export function useBridge() {
  return React.useContext(BridgeContext);
}
