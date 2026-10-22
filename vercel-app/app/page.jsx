import Link from 'next/link';
export default function Home() {
  return <><p className="eyebrow">Source-grounded public knowledge</p><h1>Understand the statements.<br/>Inspect the sources.</h1>
    <p>Browse public claims and the quotations connected to them. Each source remains separate from its interpretation.</p>
    <Link className="button" href="/explore">Explore statements →</Link>
    <section><h2>A careful migration, not a replacement landing page.</h2><p>This preview reads the existing YouCongress PostgreSQL records directly using server-side queries. It does not forward requests to the original website or require a Phoenix server. Participation features remain available only in the original application until migrated and tested.</p></section></>;
}
