# Plan

## Goal

ユーザーの要望に基づき、構築コストを下げつつリッチで美しいUI（グラスモーフィズム、ダークモード、動的アニメーションなど）を実現するため、UIライブラリとして「Tailwind CSS + daisyUI」を導入します。

## Scope

- 以前に無断で変更した `public/styles.css` のVanilla CSSによるカスタマイズをロールバック。
- Astroの公式Tailwindインテグレーションの追加 (`npx astro add tailwind`)。
- daisyUIのインストールおよび設定 (`npm i -D daisyui@latest`)。
- `src/pages/index.astro` のHTML構造をdaisyUIのコンポーネントクラス（`btn`, `input`, `select`, `glass` など）を用いてリファクタリングし、プレミアムな外観へアップグレード。
- 既存の検索機能やアクセシビリティ（キーボード操作など）を維持。

## Non-goals

- ReactやVueなどの重いクライアントサイドJSフレームワークの導入（AstroのSSR/パフォーマンスの利点を保つため）。
- 検索ロジックそのものの変更。

## Assumptions

- Tailwind CSSとdaisyUIの依存関係を追加することはユーザーから許可されている（「依存発生していいので」の意向に従う）。
- Astroプロジェクトにおいて、Tailwind + daisyUIは最も導入コストが低く、Astroの思想（ゼロJS）を阻害せずにリッチなUIコンポーネントとテーマ機能（ダークモード等）を利用できる最善の選択肢である。

## Steps

1. 誤って先行実装した `public/styles.css` の変更を元に戻す。
2. Tailwind CSSとdaisyUIをプロジェクトにインストールし、設定ファイル (`astro.config.mjs`, `tailwind.config.mjs`) を準備する。
3. `src/pages/index.astro` のマークアップをTailwind/daisyUIベースに書き換える。
4. テーマ設定（グラスモーフィズム、モダンなカラーパレット）を微調整し、"Wow"と感じられるプレミアムな外観に仕上げる。
5. 視覚的・機能的なスモークテストを行い、正しく動作・表示されるか確認する。

## Verification

- `python3 scripts/verify.py` による自動検証。
- ローカル開発サーバーでの目視テスト（デスクトップ・モバイルレイアウト、ダークモード、インタラクション）。

## Open Issues

- 特になし
