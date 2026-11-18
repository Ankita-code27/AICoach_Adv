import "./src/polyfills.js";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import app from "./src/app.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(serverDirectory, ".env") });

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
