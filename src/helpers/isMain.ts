import { fileURLToPath } from "node:url";
import path from "node:path";

export function isMain(moduleUrl: string) {
  // Convert the provided module's URL to a file path
  const modulePath = fileURLToPath(moduleUrl);

  // Get the main module's file path
  const mainModulePath = process.argv[1];

  // Compare the resolved paths
  return path.resolve(modulePath) === path.resolve(mainModulePath);
}
