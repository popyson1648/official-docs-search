# Plan

## Goal

Add a small bilingual footer to LangRef Search with accessible Terms of Use,
Privacy Policy, and issue-report links, while preserving the current search
experience and accurately describing the service's actual data flows.

## Scope

- Add Japanese and English Terms of Use pages.
- Add Japanese and English Privacy Policy pages.
- Add a compact, theme-aware footer to the search page and legal pages.
- Add an external issue-report link to a user-created Google Form.
- Document the Google Form's recommended questions, privacy notice, settings,
  and response-retention policy.
- Target Cloudflare Workers for production, with persistent request logging and
  analytics disabled.
- Keep normal interactive searches in the browser without fetching another
  server-rendered page.
- Self-host the existing Google Fonts WOFF2 subsets without changing typography.
- Keep the homepage as the only product/search entry point.
- Update tests, metadata, and project documentation where the implementation
  changes reusable page structure or verification requirements.

## Non-goals

- Creating or administering the Google Form inside the user's Google account.
- Adding analytics, advertising, accounts, payments, or consent-management
  software.
- Creating additional marketing or localized landing pages.
- Providing a legal opinion or guaranteeing compliance in every jurisdiction.
- Accepting confidential vulnerability details through the general issue form.

## Assumptions

- LangRef Search remains a non-commercial documentation search service without
  accounts, advertising, analytics, or user-generated public content.
- Search is performed client-side after first-party index files load. A query
  URL can still reach the host when it is directly opened, reloaded, shared, or
  used without JavaScript.
- Functional cookies and session storage are used only for interface, source,
  theme, and disclosure-state preferences.
- Google Forms is the only intentional third-party browser service covered by
  this task. Font binaries are served from the first-party origin.
- Legal pages use the existing `ui=ja|en` locale behavior and theme controls.
- Legal pages are ancillary pages, not alternative product landing pages.
- The controller is Shunsuke Setoguchi in Japan, operating personally and
  non-commercially, with `popyson1648 at gmail.com` as the public contact.
- Cloudflare, Inc. provides Workers, CDN, DNS, and security services.
- Only the operator can read Google Form responses. For investigation, the
  operator may manually submit minimized report content to Anthropic (Claude
  and Claude Code), OpenAI (ChatGPT and Codex), or Google (Antigravity).
- Reports are normally deleted 12 months after resolution and no later than 24
  months after submission unless a security or legal need requires longer.
- The issue form URL is `https://forms.gle/WHDXAprmCmmu9M957`.

## Steps

1. Confirm the operator/controller identity, contact route, hosting and log
   practices, service status, governing-law venue, legal-language precedence,
   and Google Forms response handling.
2. Finalize a data inventory for URL queries, request logs, functional cookies,
   session storage, Google Fonts, outbound documentation links, and Google Form
   submissions.
3. Draft concise Japanese and English Terms of Use grounded in the service's
   actual behavior, with third-party-content, availability, permitted-use,
   report-submission, liability, mandatory-consumer-law, change-notice,
   governing-law, and contact provisions.
4. Draft concise Japanese and English Privacy Policy content covering the
   controller, collected data, purposes and legal bases, recipients,
   international processing, retention, security, user rights, complaints,
   minors, changes, and contact details.
5. Define the Google Form with data-minimizing settings, bilingual field labels,
   a collection notice linking to the Privacy Policy, optional contact details,
   no file uploads, and warnings not to submit secrets or personal data.
6. Implement reusable legal-page structure and a compact footer that matches
   the existing light and dark themes without changing the search flow.
7. Configure the supplied Google Form URL as an external issue-report link with
   safe link attributes.
8. Add or update tests for locale rendering, metadata, footer links, external
   link behavior, and the privacy disclosure of existing storage/data flows.
9. Review the Japanese and English texts against each other and against the
   implementation, then run the repository verification workflow and UI checks.

## Verification

- Run `python3 scripts/verify.py`.
- Render the homepage, Terms, and Privacy pages in Japanese and English.
- Verify footer and legal pages in light and dark themes at desktop and mobile
  viewport sizes.
- Verify keyboard navigation, focus indicators, semantic landmarks, and
  external-link behavior.
- Verify every disclosed cookie, storage key, third-party request, form field,
  and retention rule against the code and configured services.
- Confirm legal pages do not become alternative search entry points.
- Confirm the Google Form is reachable without sign-in and does not collect a
  Google-account email or permit file uploads.

## Open Issues

- None. The terms use Japanese law without an exclusive-venue clause, and the
  Japanese and English texts are intended to remain substantively equivalent.
