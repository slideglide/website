import { defineConfig } from "astro/config";
import { SITE } from "./src/config/site.ts";

export default defineConfig({
    site: SITE.url,
    output: "static",
    markdown: {
        shikiConfig: {
            themes: { light: "github-light-high-contrast", dark: "github-dark-high-contrast" },
            defaultColor: false,
        },
    },
});
