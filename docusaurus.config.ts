export default {
    title: 'Documentation',
    url: 'https://tsaxking.github.io/',
    baseUrl: '/sveltekit-template/',
    presets: [
  [
    '@docusaurus/preset-classic',
    {
      docs: {
        path: 'docs',
        routeBasePath: '/',
        include: ['**/*.md', '**/*.mdx'],  // include only markdown/mdx
        exclude: ['**/*.d.ts'],              // exclude .d.ts files
      },
    },
  ],
],
}