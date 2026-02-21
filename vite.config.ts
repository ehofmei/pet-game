import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const getGithubPagesBasePath = (): string => {
	const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
	if (!repositoryName) {
		return '/'
	}

	// User/organization pages use repo "<owner>.github.io" and should serve from root.
	if (repositoryName.endsWith('.github.io')) {
		return '/'
	}

	return `/${repositoryName}/`
}

const basePath = getGithubPagesBasePath()

export default defineConfig({
	base: basePath,
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		css: true,
		exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'dev-dist/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: './coverage',
		},
	},
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['apple-touch-icon.png'],
			manifest: {
				name: 'Pet Breeder Cards',
				short_name: 'Pet Cards',
				description: 'Offline-first pet breeding card tracker',
				theme_color: '#1f6ea3',
				background_color: '#f7fbff',
				display: 'standalone',
				orientation: 'portrait',
				scope: basePath,
				start_url: basePath,
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			devOptions: {
				enabled: true,
			},
		}),
	],
})
