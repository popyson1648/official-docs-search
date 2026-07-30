import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://langrefsearch.com",
  adapter: cloudflare({
    imageService: "compile"
  }),
  output: "server"
});
