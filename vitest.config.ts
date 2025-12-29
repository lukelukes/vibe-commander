import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { webdriverio } from "@vitest/browser-webdriverio";

export default defineConfig({
  plugins: [solid()],
  test: {
    browser: {
      provider: webdriverio(),
      enabled: true,
      instances: [{ browser: "chrome" }],
    },
    environment: "node",
    setupFiles: ["./vitest-browser-solid/index.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
