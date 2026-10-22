# Agent workflows

APX has repository-native workers for source discovery, verification, and structured policy intelligence. These workflows share the same persistent records and should be treated as review aids, not independent evidence.

## Quote and position review

The application can discover candidate quotations, link them to relevant statements, check source fidelity, assess relevance, infer a stance, and synthesize collections of records. The separate passes allow review of machine-discovered records, contributions made through the interface, and records created through authorized tools.

## Policy intelligence ingestion

The scheduled `APX.Workers.IntelligenceIngestionWorker` fetches configured public RSS/Atom feeds. It filters metadata by category, relevance, and freshness, then stores source-linked triage records and suggested policy links. See `config/config.exs` and `mix intelligence.ingest` for the sources and manual run command. The pipeline does not download or summarize full publisher articles.

## Review principles

> source discovery → attribution → proposal linking → source/relevance checks → reviewable status → export

These are task passes, not independent evidence sources. Agreement among automated checks is not human validation, and a stored verification status can be challenged. Keep source links and provenance intact when reviewing or exporting a record.

## Reusable skills

The skills used for repository workflows are versioned here:

- [apx-topic-quotes](skills/apx-topic-quotes/SKILL.md) discovers eligible, sourced quotes, links each to an existing statement, and infers a candidate stance.
- [apx-verify-quotes](skills/apx-verify-quotes/SKILL.md) performs structured source-fidelity, quote-statement relevance, and stance checks on pending records.

To make these available locally, copy the skill directories into `~/.codex/skills/`, preserving their names and contents. They require access to authorized APX tools; the verification skill also includes its validation references under `references/`.
