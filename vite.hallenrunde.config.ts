import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createHallenrundeHandler, json } from "./server/hallenrunde-api";
import { localAdminReport, localHallRpc, openLocalHallenrunde } from "./server/hallenrunde-local";

async function readLocalInvites() {
  try {
    return JSON.parse(await readFile(".codex-tmp/hallenrunde-invites.json", "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function demoApi(): Plugin {
  let database: ReturnType<typeof openLocalHallenrunde> | undefined;
  const getDatabase = () => {
    database ??= (async () => {
      const directory = path.resolve(".codex-tmp/hallenrunde-postgres");
      await mkdir(directory, { recursive: true });
      return openLocalHallenrunde(directory, await readLocalInvites());
    })().catch(error => {
      database = undefined;
      throw error;
    });
    return database;
  };

  return {
    name: "hallenrunde-local-demo",
    apply: "serve",
    configureServer(server) {
      // Vite creates the new server before closing the old one. Open only on the first request.
      server.middlewares.use("/api/hallenrunde-2027", createHallenrundeHandler(async (name, args) => {
        const db = await getDatabase();
        return localHallRpc(db)(name, args);
      }, false));
      server.middlewares.use("/__hallenrunde/overview", async (req, res) => {
        // Local demo only; this path is never mounted in the deployed app.
        if (req.method !== "GET" || req.headers.host !== "127.0.0.1:8787" ||
            (req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin")) {
          return json(res, 403, { message: "Nur in der lokalen Vorschau verfügbar." });
        }
        try { return json(res, 200, await localAdminReport(await getDatabase())); }
        catch { return json(res, 503, { message: "Die Übersicht konnte nicht geladen werden." }); }
      });
    },
    async closeBundle() {
      if (database) await (await database).close();
    },
  };
}

export default defineConfig({
  plugins: [react(), demoApi()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  optimizeDeps: { entries: ["index.html", "hallen/2027/index.html"] },
  build: { outDir: "dist/hallenrunde-preview", rollupOptions: { input: "hallen/2027/index.html" } },
  server: { host: "127.0.0.1", port: 8787, strictPort: true, watch: { ignored: ["**/.codex-tmp/**"] } },
});
