import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://langref-search.popyson.com",
  adapter: cloudflare({
    imageService: "compile"
  }),
  output: "server"
});
