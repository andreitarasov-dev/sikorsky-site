import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "./config.js";
import type { ResolvedThemeConfig } from "./types.js";

const VIRTUAL_MODULE_ID = "virtual:theme-config";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

export interface ThemeIntegrationOptions {
  /**
   * Theme configuration. Pass the result of defineConfig() here.
   */
  config?: ResolvedThemeConfig;
}

/**
 * Astro integration for the @sikorsky/astro-theme package.
 *
 * This integration:
 * 1. Provides a virtual module `virtual:theme-config` that components can import
 * 2. Serves Inter fonts from the package during dev and copies them to dist during build
 */
export function themeIntegration(options: ThemeIntegrationOptions = {}): AstroIntegration {
  const config = options.config ?? defaultConfig;

  // Get the package directory where fonts are located
  const packageDir = dirname(fileURLToPath(import.meta.url));
  const fontsSource = join(packageDir, "fonts", "Inter");

  // Vite plugin to serve fonts from package
  const fontsPlugin = (): Plugin => {
    return {
      name: "sikorsky-theme-fonts",
      configureServer(server) {
        // Serve fonts and CSS from node_modules during dev
        server.middlewares.use("/fonts/Inter", (req, res, next) => {
          if (!req.url) {
            next();
            return;
          }

          // Extract filename from URL (remove leading slash and /fonts/Inter prefix if present)
          const filename = req.url.replace(/^\/fonts\/Inter\//, "").replace(/^\//, "");
          const fontPath = join(fontsSource, filename);
          
          if (!existsSync(fontPath)) {
            next();
            return;
          }

          try {
            const fontFile = readFileSync(fontPath);
            const ext = extname(fontPath).toLowerCase();
            
            // Set appropriate content type
            const contentType =
              ext === ".woff2" ? "font/woff2" :
              ext === ".woff" ? "font/woff" :
              ext === ".ttf" ? "font/ttf" :
              ext === ".otf" ? "font/otf" :
              ext === ".css" ? "text/css" :
              "application/octet-stream";

            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.end(fontFile);
          } catch (error) {
            next();
          }
        });
      },
      generateBundle() {
        // Copy fonts to dist during build
        if (existsSync(fontsSource)) {
          const distFontsDir = join(process.cwd(), "dist", "fonts", "Inter");
          try {
            mkdirSync(distFontsDir, { recursive: true });
            cpSync(fontsSource, distFontsDir, { recursive: true });
          } catch (error) {
            // Error will be caught by build process
            console.warn(`Could not copy fonts to dist: ${error}`);
          }
        }
      }
    };
  };

  return {
    name: "@sikorsky/astro-theme",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: "sikorsky-theme-virtual-config",
                resolveId(id: string) {
                  if (id === VIRTUAL_MODULE_ID) {
                    return RESOLVED_VIRTUAL_MODULE_ID;
                  }
                },
                load(id: string) {
                  if (id === RESOLVED_VIRTUAL_MODULE_ID) {
                    return `export default ${JSON.stringify(config)};`;
                  }
                }
              },
              fontsPlugin()
            ]
          }
        });
      }
    }
  };
}
