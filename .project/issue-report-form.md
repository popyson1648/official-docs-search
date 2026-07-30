# Issue Report Form

Public form: <https://forms.gle/WHDXAprmCmmu9M957>

Use one bilingual Google Form. Put Japanese first, followed by English. Do not
require Google sign-in, collect verified email addresses, or allow file uploads.
Only Shunsuke Setoguchi may access responses.

## Form Introduction

A link to the Privacy Policy alone is not enough. The introduction must state the
purpose, the recipients, the retention period, and that answering is voluntary,
because a respondent decides what to submit before opening another page. Field 12
then records the acknowledgement separately from the act of submitting.

> LangRef Searchの不具合報告フォームです。
> 送信は任意で、送信しなくても本サービスは利用できます。
>
> 【取得目的】報告された不具合の調査、再現、修正、および必要な場合の返信。
> 【取得者】Shunsuke Setoguchi（LangRef Search運営者）。回答を閲覧できるのは運営者のみです。
> 【取扱い】原因調査のため、報告内容の全部または一部を、連絡先など調査に不要な情報を削除したうえで、
> Claude、Claude Code、ChatGPT、Codex、Antigravityへ手動で入力する場合があります。
> 【保存期間】対応完了後12か月を目安に削除し、原則として送信から24か月を超えて保持しません。
> 【入力しないでください】パスワード、APIキー、非公開コード、機密情報、要配慮個人情報、第三者の個人情報。
>
> 詳しくは https://langref-search.popyson.com/privacy?ui=ja を確認してください。
>
> ---
>
> Use this form to report a problem with LangRef Search. Submitting is optional,
> and you can use the Service without it.
>
> Purpose: investigating, reproducing, and fixing the reported problem, and
> replying when necessary. Recipient: Shunsuke Setoguchi, the operator of LangRef
> Search; only the operator can read responses. Handling: for investigation, all
> or part of a report may be entered manually into Claude, Claude Code, ChatGPT,
> Codex, or Antigravity after contact details and other information not needed for
> the investigation are removed. Retention: deleted around 12 months after the
> issue is resolved, and normally no later than 24 months after submission. Do not
> submit passwords, API keys, non-public code, confidential information, sensitive
> personal data, or another person's personal data.
>
> See https://langref-search.popyson.com/privacy?ui=en.

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
12. **情報の取扱いの確認 / Data-use acknowledgement** — required checkbox, one
    option, question text `情報の取扱いへの同意 / Consent to data handling`
    - `プライバシーポリシーを読み、報告内容および任意で入力した連絡先が上記の目的
      で利用されること、調査のため不要な情報を削除したうえで外部AIサービスへ入力
      される場合があることに同意します。 / I have read the Privacy Policy and
      consent to my report, and any contact details I choose to provide, being
      used for the purposes above, including manual entry into external AI
      services after information not needed for the investigation is removed.`

    Keep this a separate required checkbox rather than treating submission itself
    as consent, so the record shows the respondent acted on the notice. Do not
    pre-select it.

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
