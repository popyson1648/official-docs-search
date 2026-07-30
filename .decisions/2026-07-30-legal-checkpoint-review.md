# Decision

## Title

Record the engineering legal-checkpoint review and publish the index-scope limits

## Date

2026-07-30

## Status

Accepted

## Decision

The service was reviewed against the engineering legal checkpoint guide at
`https://h-kono-it.github.io/legal-check-helper/`, covering external-service
collection, web fonts, assets and OSS licensing, analytics tags and SDKs, and
GDPR exposure. Three things changed as a result:

- The indexer user agent identifies the service and carries a contact URL:
  `langref-search-indexer/0.3 (+https://langref-search.popyson.com/)`.
- The Terms state what the index stores, that document bodies are never copied,
  that collection follows each publisher's robots rules and terms with bounded
  request rates, and that rights holders can request removal or correction.
- The Privacy Policy states that no analytics, advertising, measurement, or
  error-tracking tag or SDK is embedded, that all page assets are first-party,
  and that transmission to a third party happens only when the user opens an
  external link or the report form.

## Context

The guide lists, for each feature area, the applicable laws and the conditions
that should be escalated to a professional. Four of its areas apply to this
service, and the existing implementation already satisfied most of them:
`.project/index-sources.md` records the per-host robots and terms review,
title-and-URL-only collection, bounded concurrency, timeouts, the published GNU
crawl delay, excluded hosts, and per-source attribution and license limits; the
pinned WOFF2 subsets are OFL-licensed and shipped with their upstream license
files; dependencies carry permissive licenses with no GPL or AGPL obligations;
and the service embeds no third-party scripts.

The gaps were that the crawler identified itself without a contact route, and
that the copyright-minimizing index design and the absence of third-party
transmission were documented only internally, where neither upstream operators
nor users could see them.

## Alternatives

- Change nothing: the design was already conservative, but upstream operators
  had no way to reach the operator from a request log, and users had to infer the
  absence of tracking from the absence of evidence.
- Add a consent banner: there is nothing to consent to. The only client storage
  keeps interface choices the user makes, and no tracking or advertising storage
  exists.
- Appoint an EU representative and build GDPR consent flows: not supported by the
  facts below.

## Reason

Publishing the collection boundary in the Terms turns an internal policy into a
commitment third-party rights holders can rely on and act against, and a
contactable user agent lets an upstream operator raise a problem before blocking
the indexer. Stating the absence of third-party transmission is a verifiable
fact about the deployment, checked by the workerd contract tests, and is the
information a reader looks for when a policy lists cookies.

For GDPR the assessment basis is recorded rather than a conclusion asserted: the
service is personal and non-commercial, has no accounts, payments, advertising,
analytics, profiling, or cross-site tracking, stores only interface preferences
chosen by the user, and offers Japanese and English purely because the indexed
documentation is written in those languages, without EU-targeted marketing,
pricing, or delivery. The Privacy Policy nevertheless describes purposes, legal
bases, retention, and user rights, and points to supervisory authorities in Japan
and the EEA, so users are covered regardless of how the territorial question is
resolved.

## Consequences

- Upstream operators can identify and contact the indexer from their logs.
- The Terms and Privacy Policy carry commitments that must stay true: if the
  index ever stores document bodies, or any third-party tag is added, both texts
  and the contract tests must be updated in the same change.
- The review is dated. Robots rules and site terms are already scheduled for
  recheck before an endpoint or collection method changes.

## Revisit Conditions

Revisit if the service adds analytics, advertising, accounts, payments, or any
third-party script; if it begins targeting EU users with marketing, pricing, or
delivery; if collection moves beyond published indexes to page crawling; or if
brand or font assets are replaced with material under different terms.
