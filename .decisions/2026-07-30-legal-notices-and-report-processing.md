# Decision

## Title

Publish ancillary legal notices and minimize issue-report data

## Date

2026-07-30

## Status

Accepted

## Decision

Add concise Japanese and English Terms of Use and Privacy Policy pages. Link
them from a compact footer together with the external Google Forms issue-report
link. Mark the legal pages `noindex,follow` and keep them out of the sitemap so
the top page remains the only product entry.

Only the operator may access form responses. The operator may use Anthropic
(Claude and Claude Code), OpenAI (ChatGPT and Codex), and Google (Antigravity)
to investigate reports after removing contact details and other unnecessary
personal or confidential information.

Normally delete reports 12 months after resolution and no later than 24 months
after submission, unless an active security investigation or legal obligation
requires longer retention.

## Context

The service has no accounts, advertising, analytics, payments, or public user
content. It still processes HTTP request metadata, functional preferences,
search URLs in fallback cases, and voluntary issue reports. Google Forms and
external AI services add processors and international data flows that must be
explained accurately.

## Alternatives

- Publish only a short operator notice.
- Provide legal notices only inside the Google Form.
- Avoid external AI analysis of reports.

## Reason

Separate notices make the limited data flow understandable without adding
consent software or changing the search experience. Explicit provider names,
minimization, restricted access, and a deletion schedule make the actual
report-handling practice reviewable.

## Consequences

- Legal text must stay aligned with cookies, storage, hosting, the form, AI
  providers, and retention practice.
- The form must not require sign-in, verified email collection, or file upload.
- Reporters are warned not to submit credentials, secrets, non-public code, or
  unnecessary personal data.
- Japanese and English versions are intended to remain substantively
  equivalent; neither is declared controlling.

## Revisit Conditions

Revisit before adding accounts, analytics, advertising, payments, new
processors, public submissions, security-report uploads, or a business entity.
