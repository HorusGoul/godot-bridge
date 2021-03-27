import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import godotPlugin from "vite-godot-bridge-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), godotPlugin()],
});
