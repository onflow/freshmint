import { defineConfig } from 'tsup';
import { esbuildPluginVersionInjector } from 'esbuild-plugin-version-injector';

export default defineConfig({
  entry: ['index.ts', 'crypto/index.ts', 'metadata/index.ts'],
  outDir: './dist',
  format: ['esm', 'cjs'],
  loader: {
    '.cdc': 'text',
  },
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: true,
  esbuildPlugins: [esbuildPluginVersionInjector({ filter: /version.ts/ })],
});
