import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.12, resizeOptions: { background: '#0F1A3D' } },
    apple: { ...minimal2023Preset.apple, padding: 0.04, resizeOptions: { background: '#0F1A3D' } },
  },
  images: ['public/favicon.svg'],
})
