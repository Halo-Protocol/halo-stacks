import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "src/__tests__/frontend/**"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
