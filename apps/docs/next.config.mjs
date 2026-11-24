import nextra from 'nextra';

const withNextra = nextra({});

// "" for a root domain, "/name" for a site under a path (GitHub Pages).
const basePath = process.env.DOCS_BASE_PATH ?? '';

export default withNextra({
  output: 'export',
  images: { unoptimized: true },
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
});
