# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Web LLM

  Web LLMは、LLMをブラウザ上で実行するローカルAIチャットアプリです。[WebLLM](https://github.com/mlc-ai/web-llm)とWebGPUを利用するため、入力したメッセージや生成処理を外部の推論APIへ送信せず、ユーザーの端末内で完結できます。

  ## 主な機能

  - 端末性能に合わせた3種類のローカルモデル
  - トークン単位のストリーミング表示と生成停止
  - 複数チャットの作成、検索、切り替え、削除
  - 会話履歴のブラウザ内保存
  - AI回答のクリップボードへのコピー
  - デスクトップとモバイルに対応したチャットUI

  ## 動作要件

  - Node.js 20.19以降、または22.12以降
  - npm
  - WebGPU対応ブラウザ（最新版のChromeまたはEdgeを推奨）
  - WebGPU対応GPUと十分なメモリ
  - 初回のモデル取得に使用するインターネット接続と数GBの空き容量

  WebGPUはセキュアコンテキストでのみ利用できます。開発時は`localhost`でアクセスしてください。GPUやブラウザによっては、利用可能なVRAMが表示上の目安を満たしていてもモデルを読み込めない場合があります。

  ## セットアップ

  依存パッケージをインストールします。

  ```bash
  npm install
  ```

  開発サーバーを起動します。

  ```bash
  npm run dev
  ```

  `predev`スクリプトにより、起動前にモデルファイルが`public/models-v3/`へダウンロードされます。初回はファイルサイズが大きいため時間がかかります。ダウンロード済みでサイズが一致するファイルはスキップされ、中断したファイルは可能な場合に再開されます。

  ターミナルに表示されたURL（通常は`http://localhost:5173`）をWebGPU対応ブラウザで開いてください。

  ## 使い方

  1. 画面上部の「モデルを選択」を押します。
  2. 使用するローカルモデルを選び、読み込みが100%になるまで待ちます。
  3. 画面下部へメッセージを入力し、送信ボタンまたは`Enter`キーで送信します。
  4. 改行する場合は`Shift + Enter`を使用します。生成中は停止ボタンで応答を中断できます。
  5. 左側のメニューから、新しいチャットの開始や履歴の検索・削除ができます。

  モデルは最初に軽量版を試し、速度や回答品質に応じて大きなモデルへ切り替えるのがおすすめです。

  | 表示名 | モデルID | 必要VRAMの目安 |
  | --- | --- | ---: |
  | Qwen 2.5 1.5B（軽量） | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | 約2 GB |
  | Qwen 2.5 3B（標準） | `Qwen2.5-3B-Instruct-q4f16_1-MLC` | 約3 GB |
  | Qwen 3 4B（高品質） | `Qwen3-4B-q4f16_1-MLC` | 約4 GB |

  ## データとキャッシュ

  - 会話履歴はブラウザの`localStorage`に保存されます。
  - WebLLMのモデル情報はIndexedDBにもキャッシュされます。
  - サーバー側への会話保存や、端末間の同期は行いません。
  - ブラウザのサイトデータを削除すると、会話履歴とキャッシュも削除されます。

  モデル本体は開発・ビルド時に`public/models-v3/`へ取得されます。このディレクトリはGit管理の対象外です。

  ## npmスクリプト

  | コマンド | 内容 |
  | --- | --- |
  | `npm run dev` | モデルを確認・取得して開発サーバーを起動 |
  | `npm run build` | モデルを確認・取得してTypeScriptとViteの本番ビルドを実行 |
  | `npm run preview` | ビルド済みアプリをローカルでプレビュー |
  | `npm run lint` | ESLintを実行 |
  | `npm run models:download` | 不足しているモデルファイルを取得 |
  | `npm run models:check` | ダウンロードせず、取得が必要なファイルを表示 |

  本番ビルドは`dist/`へ出力されます。

  ```bash
  npm run build
  npm run preview
  ```

  ## 技術構成

  - React 19
  - TypeScript
  - Vite
  - `@mlc-ai/web-llm`
  - WebGPU
  - Lucide React

  モデル一覧とVRAM設定は`src/localModels.ts`、モデル取得処理は`scripts/download-models.mjs`で管理しています。モデルを追加・変更する場合は、両方の定義を揃えてください。

  ## トラブルシューティング

  ### モデルを読み込めない

  ブラウザがWebGPUに対応しているか、GPUドライバーが最新か、必要なVRAMがあるかを確認してください。まず軽量モデルを選ぶと、端末性能による問題かを切り分けやすくなります。

  ### モデルのダウンロードに失敗する

  ネットワーク接続と空き容量を確認し、次のコマンドを再実行してください。途中まで取得したファイルは可能な場合に続きからダウンロードされます。

  ```bash
  npm run models:download
  ```

  ### 古いキャッシュによりJSONエラーが出る

  アプリは不正なモデルキャッシュを検出すると自動修復を試みます。解消しない場合は、ブラウザの開発者ツールからこのサイトのIndexedDBとサイトデータを削除し、再度モデルを選択してください。
