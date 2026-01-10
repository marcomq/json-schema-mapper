import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      // To add only specific polyfills, add them here. If no option is given,
      // all polyfills are added.
      include: ['buffer', 'path'],
    })
  ],
  optimizeDeps: {
    include: ['@apidevtools/json-schema-ref-parser'],
  },
})
