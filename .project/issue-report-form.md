# Issue Report Form

Public form: <https://forms.gle/WHDXAprmCmmu9M957>

Use one bilingual Google Form. Put Japanese first, followed by English. Do not
require Google sign-in, collect verified email addresses, or allow file uploads.
Only Shunsuke Setoguchi may access responses.

## Form Introduction

> LangRef Searchの不具合報告フォームです。パスワード、APIキー、非公開コード、
> 機密情報、要配慮個人情報、第三者の個人情報は入力しないでください。報告内容は
> 調査のため、不要な個人情報を削除したうえで、Claude、ChatGPT、Claude Code、
> Codex、Antigravityで解析する場合があります。詳しくは
> https://langref-search.popyson.com/privacy?ui=ja を確認してください。
>
> Use this form to report a problem with LangRef Search. Do not submit
> passwords, API keys, non-public code, confidential information, sensitive
> personal data, or another person's personal data. For investigation, report
> content may be analyzed with Claude, ChatGPT, Claude Code, Codex, or
> Antigravity after unnecessary personal data is removed. See
> https://langref-search.popyson.com/privacy?ui=en.

## Fields

1. **報告の種類 / Report type** — required, single choice
   - 検索結果・検索動作 / Search results or behavior
   - ソース・索引 / Source or index
   - 表示・操作 / Display or interaction
   - 速度・安定性 / Performance or stability
   - アクセシビリティ / Accessibility
   - その他 / Other
2. **概要 / Summary** — required, short answer
3. **問題が発生したページのURL / URL where the problem occurred** —
   required, short answer with URL validation
4. **再現手順 / Steps to reproduce** — required, paragraph
5. **期待した結果 / Expected behavior** — required, paragraph
6. **実際の結果 / Actual behavior** — required, paragraph
7. **再現頻度 / Frequency** — required, single choice
   - 毎回 / Every time
   - ときどき / Sometimes
   - 1回だけ / Once
8. **利用環境 / Environment** — optional, paragraph
   - Description: `端末、OS、ブラウザとバージョンを記載してください。 /
     Include device, OS, browser, and version.`
9. **検索語とソース設定 / Search terms and source settings** — optional,
   paragraph
   - Description: `個人情報や秘密情報を除いてください。 / Remove personal
     or confidential information.`
10. **補足 / Additional context** — optional, paragraph
11. **返信先メールアドレス / Contact email** — optional, short answer with
    email validation
    - Description: `回答や追加確認が必要な場合にのみ使用します。 / Used only
      when a response or clarification is needed.`
12. **情報の取扱いの確認 / Data-use acknowledgement** — required checkbox
    - `プライバシーポリシーと、報告内容が不要な個人情報を削除したうえで外部AI
      サービスにより解析される場合があることを確認しました。 / I have read the
      Privacy Policy and understand that report content may be analyzed by
      external AI services after unnecessary personal data is removed.`

## Google Forms Settings

- Do not collect email addresses automatically.
- Do not restrict responses to signed-in users.
- Do not enable file uploads.
- Do not publish response summaries.
- Do not show other respondents' answers.
- Do not link the form to a spreadsheet unless operationally necessary.
- Keep response access restricted to the operator's account.
- Delete a response 12 months after the reported issue is resolved and no later
  than 24 months after submission, unless an active security investigation or
  legal obligation requires longer retention.

Before submitting report text to Anthropic, OpenAI, or Google AI services,
remove contact details, identifiers, credentials, non-public code, and other
content not needed to reproduce or fix the issue.
