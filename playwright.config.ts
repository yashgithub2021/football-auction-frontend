import { defineConfig, devices } from "@playwright/test";

/**
 * Browser E2E against the REAL stack: the actual backend (tsx, in-memory
 * rooms) and a production build of this frontend, on dedicated ports so they
 * never collide with dev servers on 3000/4000. Nothing is mocked.
 */
const BACKEND_PORT = 4100;
const FRONTEND_PORT = 3100;
const HOST = "127.0.0.1";
const FRONTEND_URL = `http://${HOST}:${FRONTEND_PORT}`;
const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Several browser contexts share one room per describe block; keep runs sequential and deterministic.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium" }],
  webServer: [
    {
      command: "npm start",
      cwd: "../backend",
      url: `${BACKEND_URL}/health`,
      env: { PORT: String(BACKEND_PORT), HOST, ALLOWED_ORIGINS: FRONTEND_URL },
      reuseExistingServer: false,
      timeout: 30_000,
      stdout: "ignore",
    },
    {
      command: `npm run build && npx next start -p ${FRONTEND_PORT} -H ${HOST}`,
      url: FRONTEND_URL,
      env: { NEXT_PUBLIC_SERVER_URL: BACKEND_URL },
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "ignore",
    },
  ],
});
