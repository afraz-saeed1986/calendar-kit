import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents as getMDXComponents } from '../../mdx-components';

const generateParams = generateStaticParamsFor('mdxPath');

export async function generateStaticParams() {
  const params = await generateParams();
  // Nextra gives [""] for the home page. Next.js wants [] for the root of an optional catch-all route.
  return params.map(({ mdxPath }) => ({ mdxPath: mdxPath.filter(Boolean) }));
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

const Wrapper = getMDXComponents().wrapper;

export default async function Page(props) {
  const params = await props.params;
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath);
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
