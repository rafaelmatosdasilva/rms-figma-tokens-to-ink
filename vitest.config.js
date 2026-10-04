import { defineConfig } from 'vitest/config';

// The plugin backend is an ESM module that runs against a mocked `figma` global, so the node environment is enough:
// no DOM. Real timers: the handlers await yieldTick() (a real setTimeout), and faking them would stall every loop.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    testTimeout: 20000,
    // The design system's test helpers load the plugin for each test after vi.resetModules(); processed by vitest
    // (not left external as an installed package), each load gets a fresh module, as the tests need.
    server: { deps: { inline: ['@rms/ds-core'] } },
  },
});
