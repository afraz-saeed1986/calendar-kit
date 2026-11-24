import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: { default: 'calendrix', template: '%s – calendrix' },
  description:
    'An accessible date and time picker with Persian (Jalali) and Gregorian calendars, for React, Vue and Angular.',
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={<Navbar logo={<b>calendrix</b>} />}
          pageMap={await getPageMap()}
          footer={<Footer>MIT {new Date().getFullYear()} © calendrix</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
