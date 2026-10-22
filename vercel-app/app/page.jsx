import Link from 'next/link';

export default function Home() {
  return <>
    <p className="eyebrow">Source-grounded public knowledge</p>
    <h1>Policy decisions start<br/>with inspectable evidence.</h1>
    <p className="lede">APX connects policy statements to sourced quotations, persistent public votes, reconsiderations, and intelligence analysis—without separating a claim from its provenance.</p>
    <div className="actions"><Link className="button" href="/explore">Explore statements →</Link><Link className="text-link" href="/intelligence">Read intelligence</Link></div>
    <section className="feature-grid" aria-label="APX capabilities">
      <article><p className="eyebrow">Explore</p><h2>Claims and evidence</h2><p>Create policy statements, compare sources, and keep your own records updated in shared PostgreSQL storage.</p></article>
      <article><p className="eyebrow">Reconsider</p><h2>Reopen the question</h2><p>Inspect requests to revisit a statement when evidence, context, or reasoning changes.</p></article>
      <article><p className="eyebrow">Intelligence</p><h2>Analysis with context</h2><p>Read published intelligence posts alongside the structured public record.</p></article>
    </section>
  </>;
}
