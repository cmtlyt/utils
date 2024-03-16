import { defineConfig } from "vite";
import { globSync } from "glob";
import { normalize, sep } from "node:path";

const sourceDir = new URL("./src", import.meta.url);
const entrys = globSync(`${sourceDir}/*.js`, {
  nodir: true,
  absolute: true,
}).reduce((result, path) => {
  const fileName = path.split(sep).pop().split(".").shift();
  result[fileName] = normalize(path);
  return result;
}, {});

export default defineConfig({
  mode: "production",
  build: {
    lib: {
      entry: entrys,
      formats: ["es"],
    },
    outDir: "dist",
  },
});
