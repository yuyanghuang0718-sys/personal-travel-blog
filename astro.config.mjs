import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://yuyanghuang0718-sys.github.io",
  base: "/personal-travel-blog",
  integrations: [mdx()],
  output: "static",
});
