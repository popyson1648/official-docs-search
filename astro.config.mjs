import node from "@astrojs/node";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://official-docs-search.popyson.com",
  adapter: node({
    mode: "middleware"
  }),
  output: "server"
});
