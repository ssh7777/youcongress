import Link from 'next/link';
import './style.css';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'APX';

export const metadata = {
  title: {default: `${appName} · Public records`, template: `%s · ${appName}`},
  description: 'Explore policy statements, sourced public quotations, vote tallies, and intelligence posts.'
};
export default function Layout({children}) {
  return <html lang="en"><body>
    <header><Link href="/">{appName}</Link>
      <nav>
        <Link href="/explore">Explore</Link>
        <Link href="/reconsider">Reconsider</Link>
        <Link href="/intelligence">Intelligence</Link>
      </nav>
    </header>
    <aside className="notice">Public records · Read-only browsing. Accounts, authenticated voting and delegation are not enabled in this build.</aside>
    <main>{children}</main>
    <footer>Structured annotations: CC BY 4.0, attribution {appName}. Third-party quotations retain their original rights.</footer>
  </body></html>;
}
