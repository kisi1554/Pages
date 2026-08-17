# pages-root

`Pages` リポジトリの**直下**に置くファイル。

現在は `index.html`（https://kisi1554.github.io/Pages/ のトップページ）のみ。
各アプリへのリンク一覧になっている。

## 同期のしかた

アプリ本体（`eki-stamp-rally` など）とは同期方法が違うので注意。

```powershell
# ここは /MIR を使わない。Pages 直下には .git や各アプリのフォルダがあるため
robocopy pages-root "C:\Users\kisi1\repos\Pages" index.html
```

詳しくは [`../docs/pages-sync.md`](../docs/pages-sync.md) を参照。

## アプリを増やしたとき

`index.html` の `<a class="card"> ... </a>` のブロックを1つコピーして、
`href` / 絵文字 / 名前 / 説明 / 色（`--accent`, `--tint`）を書き換える。
`href` は Pages 上のフォルダ名（末尾に `/`）にする。
