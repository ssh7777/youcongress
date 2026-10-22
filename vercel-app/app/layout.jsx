import Link from 'next/link';
import './style.css';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'APX';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apx-lake.vercel.app';
export const metadata = {
  metadataBase: new URL(appUrl),
  title: {default: `${appName} · Policy intelligence`, template: `%s · ${appName}`},
  description: 'Explore policy statements, sourced quotations, reconsiderations, and intelligence posts.'
};

export default function Layout({children}) {
  return <html lang="en"><body>
    <header><Link className="brand" href="/" aria-label={`${appName} home`}>{appName}</Link><nav aria-label="Main navigation"><Link href="/explore">Explore</Link><Link href="/reconsider">Reconsider</Link><Link href="/intelligence">Intelligence</Link></nav></header>
    <main>{children}</main>
    <footer><strong>{appName}</strong> · Source-grounded policy intelligence.<br/>Structured annotations: CC BY 4.0 · Third-party quotations retain their original rights.</footer>
  </body></html>;
}
