import Link from 'next/link';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'APX';

export default function Home() {
  return <><p className="eyebrow">Source-grounded public knowledge</p>
    <h1>Understand the statements.<br/>Inspect the sources.</h1>
    <p>{appName} is a public-records platform for hard policy questions. Browse claims and the quotations connected to them, review how people are voting, and follow policy intelligence. Each source remains separate from its interpretation.</p>
    <Link className="button" href="/explore">Explore statements →</Link>
    <section><h2>Three ways in</h2>
      <ul className="cards">
        <li><Link href="/explore"><strong>Explore</strong> — search policy statements and read the sourced quotations behind each one.</Link></li>
        <li><Link href="/reconsider"><strong>Reconsider</strong> — see where opinion stands and revisit your own positions as evidence changes.</Link></li>
        <li><Link href="/intelligence"><strong>Intelligence</strong> — follow source-linked posts tracking policy developments.</Link></li>
      </ul>
    </section>
    <section><h2>Transparent records, not verdicts</h2>
      <p>This deployment reads the {appName} PostgreSQL records directly using server-side queries. Quotes keep their original sources; annotations stay inspectable. Vote totals and record counts are not truth estimates or polls.</p>
    </section></>;
}
