import buffer from 'node:buffer';
if (!buffer.SlowBuffer) {
  (buffer as any).SlowBuffer = buffer.Buffer;
}

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
});
