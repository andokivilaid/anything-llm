import { defineConfig } from "vite"
import { fileURLToPath, URL } from "url"
import postcss from "./postcss.config.js"
import react from "@vitejs/plugin-react"
import dns from "dns"
import { visualizer } from "rollup-plugin-visualizer"

dns.setDefaultResultOrder("verbatim")

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: [
    './public/piper/ort-wasm-simd-threaded.wasm',
    './public/piper/piper_phonemize.wasm',
    './public/piper/piper_phonemize.data',
  ],
  worker: {
    format: 'es'
  },
  server: {
    port: 3000,
    host: "localhost"
  },
  define: {
    "process.env": process.env
  },
  css: {
    postcss
  },
  plugins: [
    react(),
    visualizer({
      template: "treemap", // or sunburst
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "bundleinspector.html" // will be saved in project's root
    })
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url))
      },
      {
        process: "process/browser",
        stream: "stream-browserify",
        zlib: "browserify-zlib",
        util: "util",
        find: /^~.+/,
        replacement: (val) => {
          return val.replace(/^~/, "")
        }
      }
    ]
  },
  build: {
    rollupOptions: {
      output: {
        // These settings ensure the primary JS and CSS file references are always index.{js,css}
        // so we can SSR the index.html as text response from server/index.js without breaking references each build.
        entryFileNames: 'index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css') return `index.css`;
          return assetInfo.name;
        },
        // Split big third-party deps into their own chunks so they cache
        // independently of app code and shrink the main `index.js` bundle.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@tanstack/react-query") || id.includes("@tanstack/query-core")) return "vendor-query";
          if (id.includes("/react-router-dom/") || id.includes("/react-router/")) return "vendor-router";
          if (id.match(/node_modules\/(react|react-dom|scheduler)\//)) return "vendor-react";
          if (id.includes("react-beautiful-dnd")) return "vendor-dnd";
          if (id.includes("highlight.js")) return "vendor-highlight";
          if (id.includes("markdown-it") || id.includes("/katex/")) return "vendor-markdown";
          if (id.includes("/moment/")) return "vendor-moment";
          if (id.includes("@phosphor-icons")) return "vendor-icons";
          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("/dompurify/")) return "vendor-purify";
          // recharts + @tremor intentionally NOT split: they have internal
          // circular imports that break when forced into an isolated chunk
          // (manifests as `Cannot access 'X' before initialization` at runtime).
          // Let Vite chunk them with their lazy-loaded admin route owners.
          return undefined;
        },
      },
      external: [
        // Reduces transformation time by 50% and we don't even use this variant, so we can ignore.
        /@phosphor-icons\/react\/dist\/ssr/,
      ]
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ["@mintplex-labs/piper-tts-web"],
    esbuildOptions: {
      define: {
        global: "globalThis"
      },
      plugins: []
    }
  }
})
