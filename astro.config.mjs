import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://official-docs-search.popyson.com",
  adapter: cloudflare({
    imageService: "compile"
  }),
  output: "server"
});
