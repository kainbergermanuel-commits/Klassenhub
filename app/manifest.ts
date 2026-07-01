import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KlassenHub',
    short_name: 'KlassenHub',
    description: 'Mobile-first Klassen-Kommunikation',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EFEAE0',
    theme_color: '#0F8A82',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
