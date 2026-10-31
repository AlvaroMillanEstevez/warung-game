import { release } from 'node:os';
import { defineConfig } from 'vite';

// Source files are edited from Windows through \\wsl.localhost.
// WSL file events can miss those writes and leave transformed modules stale.
export default defineConfig({
  server: { watch: { usePolling: /microsoft/i.test(release()), interval: 300 } },
});
