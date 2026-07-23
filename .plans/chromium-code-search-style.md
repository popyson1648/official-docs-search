# Plan

## Goal

ユーザーの新たなご要望（UIが崩れている、シャドウ不要、リッチ化不要、Chromium Code Searchのようにシンプルで使い勝手の良いUI）に基づき、UIデザインを完全にフラットで実用的なものへ修正します。

## Scope

- 先ほど導入したTailwind CSSおよびdaisyUIの完全削除（依存関係の解除）。
- `src/pages/index.astro` と `public/styles.css` をTailwind導入前のシンプルで安定した状態にロールバック。
- ロールバック後の `public/styles.css` をさらに見直し、Chromium Code Searchのような「シャドウなし」「フラット」「高密度」で実用性重視のUIを徹底する（必要であれば不要な装飾を削る）。

## Non-goals

- 装飾的・リッチな要素（グラスモーフィズム、アニメーション、無駄な余白やシャドウ）の追加。
- 新たなUIフレームワークの再導入。

## Assumptions

- リッチなUIライブラリ（daisyUI）がAstroのマークアップやGoogle カスタム検索エンジンの要素と競合し、表示崩れを引き起こした。
- エンジニア向けの検索ツールとしては、Chromium Code Searchのように「入力と結果が最短距離で視認できる、シンプルで軽量なデザイン」が正解である。

## Steps

1. 以下のファイルを `git checkout` によりTailwind導入前の状態へロールバックする。
   - `src/pages/index.astro`
   - `public/styles.css`
   - `package.json`
   - `astro.config.mjs`
2. 自動生成された `src/styles/global.css` 等を削除する。
3. `npm install` を実行し、Tailwind関連の不要なパッケージを削除する。
4. 元の `public/styles.css` をベースに、Chromium Code Searchを参考にした超フラットなデザイン（シャドウの完全撤廃、ボーダーベースの区切り、コンパクトな余白）に微調整する。
5. 視覚的テストおよび `python3 scripts/verify.py` を実行する。

## Verification

- ローカルサーバーで表示崩れが完全に解消され、シンプルで使い勝手の良いUIになっているか確認する。
- `python3 scripts/verify.py` による自動テストのパス。

## Open Issues

- 特になし
