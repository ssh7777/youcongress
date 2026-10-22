import Link from 'next/link';
import './style.css';
export const metadata = {title: {default: 'YouCongress · Public records', template: '%s · YouCongress'}, description: 'Explore statements and sourced public quotations.'};
export default function Layout({children}) {
  return <html lang="en"><body><header><Link href="/">YouCongress</Link><nav><Link href="/explore">Explore records</Link></nav></header>
    <aside className="notice">Vercel-native migration preview · Read-only browsing. Authentication, voting, delegation, MCP and ingestion are not migrated yet.</aside>
    <main>{children}</main><footer>Structured annotations: CC BY 4.0 · Third-party quotations retain their original rights.</footer></body></html>;
}
