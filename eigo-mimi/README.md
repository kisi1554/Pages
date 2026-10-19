# えいご みみ たんけん（年長〜小学生・保護者も一緒に）

フォニックスで英語の「音」と「つづり」を結びつけながら、**ネイティブの本物の発音を聞き取れる耳** を育てるアプリです。
入門の [`phonics-english-app/`](../phonics-english-app/)（フォニックスたんけん！、読み上げ音声で短母音〜サイレントE）の次のステップとして、
日本人が苦手な音の聞き分け（ミニマルペア）を中心に、**人の録音だけ** で練習します。

公開URL: https://kisi1554.github.io/Pages/eigo-mimi/

## モード

| モード | 内容 |
| --- | --- |
| 👂 ききわけ（メイン） | ミニマルペアの2択（絵＋つづり、違うつづりを色で強調）。正答率が8割を超えると段階が上がる: 2択 → 「おなじ？ちがう？」（AX） → 3択（cat / cut / cot など） → **初めて聞く話者の声**。「おまかせ」は苦手な対立を多めに出す |
| 📗 おと ずかん | 44音素の表（子音24・母音20、グループ別に色分け）。タップで単独音（録音がある音のみ）、くちの形のイラストとひらがなのコツ、つづりのパターン、代表語3つ（タップするたびに話者が変わる） |
| 🔤 フォニックス よみ | 聞いてつづりを選ぶ／文字タイルを並べてつづる（ブレンディング）／「おとは いくつ？」（セグメンティング、ship = 3音）。答えのあとに文字と音素の対応を表示 |
| 🃏 えいたんご カード | 聞いて絵を選ぶ（4択）／絵を見て声を選ぶ（3択）。3回正解した単語は「ことば ずかん」に入る |
| 👪 ほごしゃ がめん | 対立ごとの正答率・回数・段階、きょう／この7日間の練習数、苦手 TOP3、間違えやすい単語 |

- 正解・不正解のあとは必ず、比べる2語（例: 「right … light」）を同じ話者の声で続けて再生します（🔁 ボタンで何度でも）。
- 苦手の自動くりかえし: 対立ごと・単語ごとに正答率を記録し、ペアごとにライトナー方式（5つの箱）で間違えたものを多めに出題します。
- 🔊 もういちど、🐢 ゆっくり（録音を playbackRate 0.8 で再生。0.75 より遅くすると声が低くなりすぎるため）。
- 声の音量スライダー・ミュート、効果音（WebAudio 合成）のオン/オフ。記録は localStorage。

## 学ぶ対立（ミニマルペア）

r / l、b / v、s / θ、z・d / ð、f / h、æ / ʌ / ɑ（3択）、ɪ / iː、ʊ / uː、ɜːr / ɑːr、s / ʃ（sea – she）、n / ŋ、
語末の子音（cap – cat – can）、母音を足さない（milk – milky、sport – support）。
単語と組み合わせは [`data.js`](data.js)。**録音が見つからなかった単語は出題しません**（読み上げ音声での代用はしません）。
read / lead / live / bow / row / close / dove のように読みが2通りある単語は、録音がどちらの読みか判別できないので使っていません。
food – hood は母音も少し違います（f / h の練習として残しています）。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `index.html` / `style.css` / `app.js` | アプリ本体 |
| `data.js` | 音素44・単語（つづりと音素の対応つき）・対立 |
| `audio-index.js` | 単語・音素 → 録音ファイルと話者（自動生成） |
| `audio/words/*.mp3`, `audio/phonemes/*.mp3` | 録音（MP3 64kbps モノラル。iPhone の Safari でも確実に鳴る形式） |
| `audio/credits.json` | 1ファイルずつの元URL・作者・ライセンス・加工内容（自動生成） |

## 録音の取りなおし

```bash
python3 tools/eigo-mimi-fetch.py all     # 一覧 → 候補 → ライセンス確認 → ダウンロード → 変換 → credits.json
python3 tools/eigo-mimi/check.py         # 全ファイルの存在・長さ・無音でない・単語名の一致・ライセンス
```

Commons API はレート制限が厳しいので、1回目はファイル名一覧の取得に1時間ほどかかります（キャッシュは `tools/eigo-mimi/.cache/`、git には入れない）。
話者のなまり（US / UK など）は Lingua Libre の話者情報（住んでいる場所）から自動で決め、`tools/eigo-mimi/speakers.json` に保存します。
`"manual": true` を書いた行は手で直した値として上書きしません。
**中身の聞き取り確認（本当にその単語を言っているか）は、人がサンプルで確かめてください。**

<!-- CREDITS:start（tools/eigo-mimi-fetch.py が かきかえる。てで なおさない） -->
## 音のクレジット

録音 1438 ファイル・話者 67 人・合計 7.7 MB。すべて Wikimedia Commons（Lingua Libre を含む）から取得し、1ファイルずつ Commons API でライセンスを確認しています（パブリックドメイン・CC0・CC BY・CC BY-SA のみ）。

加工内容（全ファイル共通）: モノラル化・先頭と末尾の無音カット（silenceremove -45dB）・音量の正規化（loudnorm -18 LUFS）・MP3 64kbps モノラルに変換。
**CC BY-SA の素材は、加工後のファイルも同じ CC BY-SA ライセンスです。**CC BY / CC BY-SA の素材は作者の表示が必要です（下の表と、アプリ内の「おとの クレジット」画面）。

| ライセンス | ファイル数 |
| --- | --- |
| CC BY-SA 4.0 | 576 |
| CC BY-SA 3.0 | 404 |
| CC0 | 371 |
| Public domain | 38 |
| CC BY 3.0 us | 35 |
| CC BY 4.0 | 13 |
| CC BY 2.5 | 1 |

| ファイル | 元ファイル | 作者 | ライセンス |
| --- | --- | --- | --- |
| `words/ben--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-ben.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-ben.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/ben--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-ben.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-ben.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/ben--commander-keane.mp3` | [File:En-au-Ben.ogg](https://commons.wikimedia.org/wiki/File:En-au-Ben.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/luke--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-Luke.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-Luke.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/luke--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-Luke.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-Luke.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/luke--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-luke.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-luke.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/alive--dvortygirl.mp3` | [File:En-us-alive.ogg](https://commons.wikimedia.org/wiki/File:En-us-alive.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/alive--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-alive.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-alive.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/alive--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-alive.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-alive.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/ankle--dvortygirl.mp3` | [File:En-us-ankle.ogg](https://commons.wikimedia.org/wiki/File:En-us-ankle.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ankle--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-ankle.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-ankle.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/ant--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-ant.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-ant.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/ant--dvortygirl.mp3` | [File:En-us-ant.ogg](https://commons.wikimedia.org/wiki/File:En-us-ant.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ant--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-ant.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-ant.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/apple--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-apple.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-apple.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/apple--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-apple.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-apple.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/apple--dvortygirl.mp3` | [File:En-us-apple.ogg](https://commons.wikimedia.org/wiki/File:En-us-apple.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/arm--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-arm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-arm.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/arm--association-shtooka-judi.mp3` | [File:En-uk-arm.ogg](https://commons.wikimedia.org/wiki/File:En-uk-arm.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/arm--dvortygirl.mp3` | [File:En-us-arm.ogg](https://commons.wikimedia.org/wiki/File:En-us-arm.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/arrive--dvortygirl.mp3` | [File:En-us-arrive.ogg](https://commons.wikimedia.org/wiki/File:En-us-arrive.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/arrive--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-arrive.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-arrive.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/arrive--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-arrive.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-arrive.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/baby--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-baby.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-baby.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/baby--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-baby.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-baby.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/baby--dvortygirl.mp3` | [File:En-us-baby.ogg](https://commons.wikimedia.org/wiki/File:En-us-baby.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/back--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-back.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-back.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/back--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-back.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-back.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/back--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-back.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-back.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/bad--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bad.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bad--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-bad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-bad.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/bad--dvortygirl.mp3` | [File:En-us-bad.ogg](https://commons.wikimedia.org/wiki/File:En-us-bad.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bag--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bag.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bag.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bag--dev-jadiya.mp3` | [File:LL-Q1860 (eng)-Dev Jadiya-bag.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Dev_Jadiya-bag.wav) | Speaker: Dev Jadiya Recorder: Dev Jadiya | CC0 |
| `words/bag--dvortygirl.mp3` | [File:En-us-bag.ogg](https://commons.wikimedia.org/wiki/File:En-us-bag.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/baggy--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-baggy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-baggy.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/bale--birdhopper.mp3` | [File:En-us-bale.ogg](https://commons.wikimedia.org/wiki/File:En-us-bale.ogg) | BirdHopper | CC BY-SA 4.0 |
| `words/bale--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-bale.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-bale.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/bale--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-bale.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-bale.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/ball--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-ball.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-ball.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/ball--dvortygirl.mp3` | [File:En-us-ball.ogg](https://commons.wikimedia.org/wiki/File:En-us-ball.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ball--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-ball.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-ball.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/ban--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-ban.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-ban.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/ban--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-ban.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-ban.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/ban--fake-estate.mp3` | [File:LL-Q1860 (eng)-Fake estate-ban.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fake_estate-ban.wav) | Speaker: Fake estate Recorder: Fake estate | CC BY-SA 4.0 |
| `words/banana--dvortygirl.mp3` | [File:En-us-banana.ogg](https://commons.wikimedia.org/wiki/File:En-us-banana.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/banana--d3vil.mp3` | [File:En-uk-banana.ogg](https://commons.wikimedia.org/wiki/File:En-uk-banana.ogg) | D3VIL | Public domain |
| `words/banana--louisalphonse28.mp3` | [File:LL-Q1860 (eng)-Louisalphonse28-Banana.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Louisalphonse28-Banana.wav) | Speaker: Louisalphonse28 Recorder: Louisalphonse28 | CC0 |
| `words/bang--sylvanmoon.mp3` | [File:En-us-bang.ogg](https://commons.wikimedia.org/wiki/File:En-us-bang.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/bang--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bang.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bang.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bang--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-bang.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-bang.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/bard--dvortygirl.mp3` | [File:En-us-bard.ogg](https://commons.wikimedia.org/wiki/File:En-us-bard.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/barn--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-barn.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-barn.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/barn--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-barn.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-barn.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/base--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-base.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-base.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/base--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-base.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-base.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/base--dvortygirl.mp3` | [File:En-us-base.ogg](https://commons.wikimedia.org/wiki/File:En-us-base.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bat--dvortygirl.mp3` | [File:En-us-bat.ogg](https://commons.wikimedia.org/wiki/File:En-us-bat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bat--commander-keane.mp3` | [File:En-au-bat.ogg](https://commons.wikimedia.org/wiki/File:En-au-bat.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/bath--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bath.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bath.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bath--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-Bath.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-Bath.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/bath--dvortygirl.mp3` | [File:En-us-bath.ogg](https://commons.wikimedia.org/wiki/File:En-us-bath.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bead--dvortygirl.mp3` | [File:En-us-bead.ogg](https://commons.wikimedia.org/wiki/File:En-us-bead.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bean--dvortygirl.mp3` | [File:En-us-bean.ogg](https://commons.wikimedia.org/wiki/File:En-us-bean.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bean--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-bean.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-bean.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/bean--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-bean.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-bean.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/bear--dvortygirl.mp3` | [File:En-us-bear.ogg](https://commons.wikimedia.org/wiki/File:En-us-bear.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bear--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bear.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bear--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-bear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-bear.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/beard--dvortygirl.mp3` | [File:En-us-beard.ogg](https://commons.wikimedia.org/wiki/File:En-us-beard.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/beard--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-beard.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-beard.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/beard--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-beard.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-beard.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/beat--dvortygirl.mp3` | [File:En-us-beat.ogg](https://commons.wikimedia.org/wiki/File:En-us-beat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/beat--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-beat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-beat.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/beat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-beat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-beat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bed--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bed.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bed.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bed--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-bed.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-bed.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/bed--dvortygirl.mp3` | [File:En-us-bed.ogg](https://commons.wikimedia.org/wiki/File:En-us-bed.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bee--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bee.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bee.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bee--dvortygirl.mp3` | [File:En-us-bee.ogg](https://commons.wikimedia.org/wiki/File:En-us-bee.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bee--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bee.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bee.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bell--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bell.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bell.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bell--dvortygirl.mp3` | [File:En-us-bell.ogg](https://commons.wikimedia.org/wiki/File:En-us-bell.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bell--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bell.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bell.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/belly--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-belly.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-belly.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/belly--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-belly.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-belly.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/belly--dvortygirl.mp3` | [File:En-us-belly.ogg](https://commons.wikimedia.org/wiki/File:En-us-belly.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/below--dvortygirl.mp3` | [File:En-us-below.ogg](https://commons.wikimedia.org/wiki/File:En-us-below.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/below--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-below.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-below.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/below--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-below.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-below.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bend--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-bend.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-bend.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/bend--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bend.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bend.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bent--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bent.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bent.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bent--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-bent.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-bent.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/bent--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-bent.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-bent.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/berry--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-berry.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-berry.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/berry--dvortygirl.mp3` | [File:En-us-berry.ogg](https://commons.wikimedia.org/wiki/File:En-us-berry.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/best--dvortygirl.mp3` | [File:En-us-best.ogg](https://commons.wikimedia.org/wiki/File:En-us-best.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/best--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Best.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Best.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/best--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-best.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-best.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bet--dvortygirl.mp3` | [File:En-us-bet.ogg](https://commons.wikimedia.org/wiki/File:En-us-bet.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bet--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bet.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bet--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-bet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-bet.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/bike--dvortygirl.mp3` | [File:En-us-bike.ogg](https://commons.wikimedia.org/wiki/File:En-us-bike.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bike--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bike.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bike.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bike--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-bike.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-bike.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/bin--fake-estate.mp3` | [File:LL-Q1860 (eng)-Fake estate-bin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fake_estate-bin.wav) | Speaker: Fake estate Recorder: Fake estate | CC BY-SA 4.0 |
| `words/bin--lepticed7.mp3` | [File:LL-Q1860 (eng)-Lepticed7-bin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Lepticed7-bin.wav) | Speaker: Lepticed7 Recorder: Lepticed7 | CC BY-SA 4.0 |
| `words/bird--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bird.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bird.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bird--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-bird.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-bird.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/bird--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-bird.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-bird.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/bit--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bit.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bit--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-bit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-bit.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/bit--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-bit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-bit.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/black--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-black.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-black.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/black--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Black.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Black.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/black--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-black.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-black.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/block--dvortygirl.mp3` | [File:En-us-block.ogg](https://commons.wikimedia.org/wiki/File:En-us-block.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/block--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-block.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-block.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/block--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-block.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-block.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/blow--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-blow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-blow.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/blow--dvortygirl.mp3` | [File:En-us-blow.ogg](https://commons.wikimedia.org/wiki/File:En-us-blow.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/blow--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-blow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-blow.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/blue--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-blue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-blue.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/blue--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-BLUE.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-BLUE.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/blue--dvortygirl.mp3` | [File:En-us-blue.ogg](https://commons.wikimedia.org/wiki/File:En-us-blue.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/blush--dvortygirl.mp3` | [File:En-us-blush.ogg](https://commons.wikimedia.org/wiki/File:En-us-blush.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/blush--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-blush.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-blush.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/blush--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-blush.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-blush.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/boat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-boat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-boat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/boat--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-boat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-boat.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/boat--dvortygirl.mp3` | [File:En-us-boat.ogg](https://commons.wikimedia.org/wiki/File:En-us-boat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bog--dvortygirl.mp3` | [File:En-us-bog.ogg](https://commons.wikimedia.org/wiki/File:En-us-bog.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bog--celestianpower.mp3` | [File:En-uk-bog.ogg](https://commons.wikimedia.org/wiki/File:En-uk-bog.ogg) | Celestianpower | Public domain |
| `words/bog--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-bog.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-bog.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/bolt--dvortygirl.mp3` | [File:En-us-bolt.ogg](https://commons.wikimedia.org/wiki/File:En-us-bolt.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bolt--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-bolt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-bolt.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/book--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-book.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-book.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/book--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-book.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-book.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/book--dvortygirl.mp3` | [File:En-us-book.ogg](https://commons.wikimedia.org/wiki/File:En-us-book.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/box--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-box.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-box.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/box--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-box.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-box.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/box--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-box.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-box.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/boy--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-boy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-boy.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/boy--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-boy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-boy.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/boy--paul2520.mp3` | [File:En-us-boy.oga](https://commons.wikimedia.org/wiki/File:En-us-boy.oga) | Paul2520 | CC0 |
| `words/bread--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bread.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bread.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bread--association-shtooka-judi.mp3` | [File:En-uk-bread.ogg](https://commons.wikimedia.org/wiki/File:En-uk-bread.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/bread--dvortygirl.mp3` | [File:En-us-bread.ogg](https://commons.wikimedia.org/wiki/File:En-us-bread.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/breathe--dvortygirl.mp3` | [File:En-us-breathe.ogg](https://commons.wikimedia.org/wiki/File:En-us-breathe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/breathe--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-breathe.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-breathe.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/breathe--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-breathe.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-breathe.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/breed--neskaya.mp3` | [File:En-us-breed.ogg](https://commons.wikimedia.org/wiki/File:En-us-breed.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/breeze--dvortygirl.mp3` | [File:En-us-breeze.ogg](https://commons.wikimedia.org/wiki/File:En-us-breeze.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/breeze--commander-keane.mp3` | [File:En-au-breeze.ogg](https://commons.wikimedia.org/wiki/File:En-au-breeze.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/bridge--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bridge.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-bridge.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/bridge--dvortygirl.mp3` | [File:En-us-bridge.ogg](https://commons.wikimedia.org/wiki/File:En-us-bridge.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bridge--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bridge.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bridge.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/brown--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-brown.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-brown.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/brown--association-shtooka-judi.mp3` | [File:En-uk-brown.ogg](https://commons.wikimedia.org/wiki/File:En-uk-brown.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/brown--dvortygirl.mp3` | [File:En-us-brown.ogg](https://commons.wikimedia.org/wiki/File:En-us-brown.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/brush--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-brush.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-brush.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/brush--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-brush.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-brush.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/brush--dvortygirl.mp3` | [File:En-us-brush.ogg](https://commons.wikimedia.org/wiki/File:En-us-brush.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bug--dvortygirl.mp3` | [File:En-us-bug.ogg](https://commons.wikimedia.org/wiki/File:En-us-bug.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bug--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bug.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bug.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bug--lepticed7.mp3` | [File:LL-Q1860 (eng)-Lepticed7-bug.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Lepticed7-bug.wav) | Speaker: Lepticed7 Recorder: Lepticed7 | CC BY-SA 4.0 |
| `words/burn--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-burn.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-burn.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/burn--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-burn.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-burn.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/burn--dvortygirl.mp3` | [File:En-us-burn.ogg](https://commons.wikimedia.org/wiki/File:En-us-burn.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bus--dvortygirl.mp3` | [File:En-us-bus.ogg](https://commons.wikimedia.org/wiki/File:En-us-bus.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/bus--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-bus.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-bus.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/bus--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-bus.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-bus.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/cab--dvortygirl.mp3` | [File:En-us-cab.ogg](https://commons.wikimedia.org/wiki/File:En-us-cab.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cab--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-cab.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-cab.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cab--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-cab.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-cab.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/cake--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cake.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cake.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cake--association-shtooka-judi.mp3` | [File:En-uk-cake.ogg](https://commons.wikimedia.org/wiki/File:En-uk-cake.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/cake--dvortygirl.mp3` | [File:En-us-cake.ogg](https://commons.wikimedia.org/wiki/File:En-us-cake.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/camel--dvortygirl.mp3` | [File:En-us-camel.ogg](https://commons.wikimedia.org/wiki/File:En-us-camel.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/camel--tooironic.mp3` | [File:En-au-camel.ogg](https://commons.wikimedia.org/wiki/File:En-au-camel.ogg) | Tooironic | Public domain |
| `words/can--dvortygirl.mp3` | [File:En-us-can.ogg](https://commons.wikimedia.org/wiki/File:En-us-can.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/can--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Can.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Can.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/can--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-can.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-can.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/candy--dvortygirl.mp3` | [File:En-us-candy.ogg](https://commons.wikimedia.org/wiki/File:En-us-candy.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/candy--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-candy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-candy.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/candy--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-candy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-candy.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cap--dvortygirl.mp3` | [File:En-us-cap.ogg](https://commons.wikimedia.org/wiki/File:En-us-cap.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cap--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-cap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-cap.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cap--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-cap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-cap.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/car--dvortygirl.mp3` | [File:En-us-car.ogg](https://commons.wikimedia.org/wiki/File:En-us-car.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/car--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-car.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-car.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/car--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-car.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-car.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/carb--paul2520.mp3` | [File:En-us-carb.ogg](https://commons.wikimedia.org/wiki/File:En-us-carb.ogg) | Paul2520 | CC0 |
| `words/carb--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-carb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-carb.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/carrot--dvortygirl.mp3` | [File:En-us-carrot.ogg](https://commons.wikimedia.org/wiki/File:En-us-carrot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cart--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cart.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cart.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cart--dvortygirl.mp3` | [File:En-us-cart.ogg](https://commons.wikimedia.org/wiki/File:En-us-cart.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cat--dev-jadiya.mp3` | [File:LL-Q1860 (eng)-Dev Jadiya-cat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Dev_Jadiya-cat.wav) | Speaker: Dev Jadiya Recorder: Dev Jadiya | CC0 |
| `words/cat--dvortygirl.mp3` | [File:En-us-cat.ogg](https://commons.wikimedia.org/wiki/File:En-us-cat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/chair--dvortygirl.mp3` | [File:En-us-chair.ogg](https://commons.wikimedia.org/wiki/File:En-us-chair.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/chair--association-shtooka-judi.mp3` | [File:En-uk-chair.ogg](https://commons.wikimedia.org/wiki/File:En-uk-chair.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/chair--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Chair.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Chair.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/cheap--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cheap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cheap.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cheap--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Cheap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Cheap.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/cheap--association-shtooka-judi.mp3` | [File:En-uk-cheap.ogg](https://commons.wikimedia.org/wiki/File:En-uk-cheap.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/cheer--dvortygirl.mp3` | [File:En-us-cheer.ogg](https://commons.wikimedia.org/wiki/File:En-us-cheer.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cheer--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-cheer.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-cheer.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cheese--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cheese.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cheese.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cheese--association-shtooka-judi.mp3` | [File:En-uk-cheese.ogg](https://commons.wikimedia.org/wiki/File:En-uk-cheese.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/cheese--dvortygirl.mp3` | [File:En-us-cheese.ogg](https://commons.wikimedia.org/wiki/File:En-us-cheese.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cherry--dvortygirl.mp3` | [File:En-us-cherry.ogg](https://commons.wikimedia.org/wiki/File:En-us-cherry.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cherry--association-shtooka-judi.mp3` | [File:En-uk-cherry.ogg](https://commons.wikimedia.org/wiki/File:En-uk-cherry.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/cherry--commander-keane.mp3` | [File:En-au-cherry.ogg](https://commons.wikimedia.org/wiki/File:En-au-cherry.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/chick--dvortygirl.mp3` | [File:En-us-chick.ogg](https://commons.wikimedia.org/wiki/File:En-us-chick.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/chick--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-chick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-chick.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/chick--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-chick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-chick.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/chin--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-chin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-chin.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/chin--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-chin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-chin.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/chip--dvortygirl.mp3` | [File:En-us-chip.ogg](https://commons.wikimedia.org/wiki/File:En-us-chip.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/chip--dev-jadiya.mp3` | [File:LL-Q1860 (eng)-Dev Jadiya-chip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Dev_Jadiya-chip.wav) | Speaker: Dev Jadiya Recorder: Dev Jadiya | CC0 |
| `words/chip--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-chip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-chip.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/city--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-City.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-City.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/city--association-shtooka-judi.mp3` | [File:En-uk-city.ogg](https://commons.wikimedia.org/wiki/File:En-uk-city.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/city--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-city.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-city.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/clack--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-clack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-clack.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/clack--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-clack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-clack.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/clap--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-clap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-clap.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/clap--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-clap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-clap.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/clock--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-clock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-clock.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/clock--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-clock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-clock.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/clock--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-clock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-clock.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/clothe--dvortygirl.mp3` | [File:En-us-clothe.ogg](https://commons.wikimedia.org/wiki/File:En-us-clothe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cloud--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cloud.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cloud.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cloud--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-cloud.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-cloud.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/cloud--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-cloud.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-cloud.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/clown--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-clown.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-clown.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/clown--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-clown.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-clown.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cluck--commander-keane.mp3` | [File:En-au-cluck.ogg](https://commons.wikimedia.org/wiki/File:En-au-cluck.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/cob--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cob.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cob.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cob--dvortygirl.mp3` | [File:En-us-cob.ogg](https://commons.wikimedia.org/wiki/File:En-us-cob.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cob--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-cob.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-cob.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/cod--paul2520.mp3` | [File:En-us-COD.oga](https://commons.wikimedia.org/wiki/File:En-us-COD.oga) | Paul2520 | CC0 |
| `words/cod--dvortygirl.mp3` | [File:En-us-cod.ogg](https://commons.wikimedia.org/wiki/File:En-us-cod.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cod--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-cod.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-cod.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/coin--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-coin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-coin.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/coin--dvortygirl.mp3` | [File:En-us-coin.ogg](https://commons.wikimedia.org/wiki/File:En-us-coin.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/coin--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-coin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-coin.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/collect--neskaya.mp3` | [File:En-us-collect.ogg](https://commons.wikimedia.org/wiki/File:En-us-collect.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/collect--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-collect.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-collect.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/collect--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-collect.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-collect.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/comb--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-comb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-comb.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/comb--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Comb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Comb.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/comb--dvortygirl.mp3` | [File:En-us-comb.ogg](https://commons.wikimedia.org/wiki/File:En-us-comb.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cook--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cook.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cook.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cook--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-cook.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-cook.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/cook--dvortygirl.mp3` | [File:En-us-cook.ogg](https://commons.wikimedia.org/wiki/File:En-us-cook.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cookie--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-cookie.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-cookie.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/cookie--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-cookie.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-cookie.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/cookie--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-cookie.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-cookie.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/cop--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-cop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-cop.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/cop--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-cop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-cop.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cop--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-cop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-cop.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/corn--dvortygirl.mp3` | [File:En-us-corn.ogg](https://commons.wikimedia.org/wiki/File:En-us-corn.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/corn--association-shtooka-judi.mp3` | [File:En-uk-corn.ogg](https://commons.wikimedia.org/wiki/File:En-uk-corn.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/corn--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-corn.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-corn.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/correct--dvortygirl.mp3` | [File:En-us-correct.ogg](https://commons.wikimedia.org/wiki/File:En-us-correct.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/correct--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-correct.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-correct.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/correct--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-correct.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-correct.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cot--dvortygirl.mp3` | [File:En-us-cot.ogg](https://commons.wikimedia.org/wiki/File:En-us-cot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cot--stuart-h.mp3` | [File:En-au-cot.ogg](https://commons.wikimedia.org/wiki/File:En-au-cot.ogg) | Stuart H | Public domain |
| `words/could--dvortygirl.mp3` | [File:En-us-could.ogg](https://commons.wikimedia.org/wiki/File:En-us-could.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/could--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-could.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-could.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/could--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-could.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-could.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/cow--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cow.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cow--dvortygirl.mp3` | [File:En-us-cow.ogg](https://commons.wikimedia.org/wiki/File:En-us-cow.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cow--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-cow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-cow.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/crab--dvortygirl.mp3` | [File:En-us-crab.ogg](https://commons.wikimedia.org/wiki/File:En-us-crab.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/crab--berrely.mp3` | [File:LL-Q1860 (eng)-Berrely-crab.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Berrely-crab.wav) | Speaker: Berrely Recorder: Berrely | CC0 |
| `words/crown--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-crown.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-crown.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/crown--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-crown.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-crown.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/crown--tawker.mp3` | [File:En-ca-crown.ogg](https://commons.wikimedia.org/wiki/File:En-ca-crown.ogg) | Tawker | CC BY 2.5 |
| `words/cry--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cry.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cry.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cry--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-cry.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-cry.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/cry--dvortygirl.mp3` | [File:En-us-cry.ogg](https://commons.wikimedia.org/wiki/File:En-us-cry.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cub--dvortygirl.mp3` | [File:En-us-cub.ogg](https://commons.wikimedia.org/wiki/File:En-us-cub.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cub--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-cub.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-cub.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/cup--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cup.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cup.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cup--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-cup.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-cup.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/cup--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-cup.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-cup.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/curb--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-curb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-curb.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/curt--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-curt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-curt.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/curve--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-curve.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-curve.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/curve--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-curve.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-curve.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/curve--dvortygirl.mp3` | [File:En-us-curve.ogg](https://commons.wikimedia.org/wiki/File:En-us-curve.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/cut--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cut.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-cut.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/cut--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-cut.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-cut.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/cut--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-cut.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-cut.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/dad--dvortygirl.mp3` | [File:En-us-dad.ogg](https://commons.wikimedia.org/wiki/File:En-us-dad.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/dad--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-dad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-dad.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/dad--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-dad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-dad.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/dare--dvortygirl.mp3` | [File:En-us-dare.ogg](https://commons.wikimedia.org/wiki/File:En-us-dare.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/dare--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-dare.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-dare.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/dare--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-dare.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-dare.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/day--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-day.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-day.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/day--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Day.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Day.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/day--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-day.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-day.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/deep--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-deep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-deep.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/deep--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-deep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-deep.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/deep--dvortygirl.mp3` | [File:En-us-deep.ogg](https://commons.wikimedia.org/wiki/File:En-us-deep.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/deer--dvortygirl.mp3` | [File:En-us-deer.ogg](https://commons.wikimedia.org/wiki/File:En-us-deer.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/deer--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-deer.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-deer.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/deer--muldoonsamuel55.mp3` | [File:LL-Q1860 (eng)-Muldoonsamuel55-deer.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-deer.wav) | Speaker: Muldoonsamuel55 Recorder: Muldoonsamuel55 | CC0 |
| `words/den--neskaya.mp3` | [File:En-us-den.ogg](https://commons.wikimedia.org/wiki/File:En-us-den.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/dip--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-dip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-dip.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/dip--berrely.mp3` | [File:LL-Q1860 (eng)-Berrely-dip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Berrely-dip.wav) | Speaker: Berrely Recorder: Berrely | CC0 |
| `words/dock--dvortygirl.mp3` | [File:En-us-dock.ogg](https://commons.wikimedia.org/wiki/File:En-us-dock.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/dog--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-dog.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-dog.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/dog--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-dog.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-dog.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/dog--dvortygirl.mp3` | [File:En-us-dog.ogg](https://commons.wikimedia.org/wiki/File:En-us-dog.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/doggy--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-doggy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-doggy.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/doggy--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-doggy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-doggy.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/dolphin--dvortygirl.mp3` | [File:En-us-dolphin.ogg](https://commons.wikimedia.org/wiki/File:En-us-dolphin.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/door--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-door.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-door.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/door--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-door.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-door.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/door--dvortygirl.mp3` | [File:En-us-door.ogg](https://commons.wikimedia.org/wiki/File:En-us-door.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/dough--dvortygirl.mp3` | [File:En-us-dough.ogg](https://commons.wikimedia.org/wiki/File:En-us-dough.ogg) | Dvortygirl | Public domain |
| `words/dough--celestianpower.mp3` | [File:En-uk-dough.ogg](https://commons.wikimedia.org/wiki/File:En-uk-dough.ogg) | Celestianpower | Public domain |
| `words/doze--dvortygirl.mp3` | [File:En-us-doze.ogg](https://commons.wikimedia.org/wiki/File:En-us-doze.ogg) | Dvortygirl | Public domain |
| `words/drum--dvortygirl.mp3` | [File:En-us-drum.ogg](https://commons.wikimedia.org/wiki/File:En-us-drum.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/drum--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-drum.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-drum.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/duck--dvortygirl.mp3` | [File:En-us-duck.ogg](https://commons.wikimedia.org/wiki/File:En-us-duck.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/duck--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-duck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-duck.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/duck--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-duck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-duck.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/ear--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-ear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-ear.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/ear--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-ear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-ear.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/ear--dvortygirl.mp3` | [File:En-us-ear.ogg](https://commons.wikimedia.org/wiki/File:En-us-ear.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/eat--dvortygirl.mp3` | [File:En-us-eat.ogg](https://commons.wikimedia.org/wiki/File:En-us-eat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/eat--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-eat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-eat.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/eat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-eat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-eat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/egg--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-egg.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-egg.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/egg--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-egg.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-egg.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/egg--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-egg.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-egg.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/eight--numberone-commonswiki.mp3` | [File:En-us-Eight.ogg](https://commons.wikimedia.org/wiki/File:En-us-Eight.ogg) | NumberOne~commonswiki | Public domain |
| `words/eight--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-eight.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-eight.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/eight--recorded-by-thedaveross.mp3` | [File:En-us-eight.ogg](https://commons.wikimedia.org/wiki/File:En-us-eight.ogg) | recorded by TheDaveRoss | CC BY-SA 3.0 |
| `words/elephant--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-elephant.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-elephant.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/elephant--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-elephant.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-elephant.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/elephant--muldoonsamuel55.mp3` | [File:LL-Q1860 (eng)-Muldoonsamuel55-Elephant.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-Elephant.wav) | Speaker: Muldoonsamuel55 Recorder: Muldoonsamuel55 | CC0 |
| `words/eye--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-eye.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-eye.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/eye--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-eye.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-eye.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/eye--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-eye.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-eye.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/face--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-face.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-face.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/face--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-face.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-face.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/face--dvortygirl.mp3` | [File:En-us-face.ogg](https://commons.wikimedia.org/wiki/File:En-us-face.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fail--dvortygirl.mp3` | [File:En-us-fail.ogg](https://commons.wikimedia.org/wiki/File:En-us-fail.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fail--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fail.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fail.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fail--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-fail.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-fail.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/fair--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fair.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fair.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fair--dvortygirl.mp3` | [File:En-us-fair.ogg](https://commons.wikimedia.org/wiki/File:En-us-fair.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fair--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fair.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fair.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/faith--dvortygirl.mp3` | [File:En-us-faith.ogg](https://commons.wikimedia.org/wiki/File:En-us-faith.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/faith--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Faith.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Faith.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/faith--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-faith.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-faith.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fall--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fall.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fall.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fall--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fall.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fall.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fall--dvortygirl.mp3` | [File:En-us-fall.ogg](https://commons.wikimedia.org/wiki/File:En-us-fall.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fan--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-fan.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-fan.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/fan--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fan.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fan.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fan--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-fan.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-fan.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/fang--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-fang.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-fang.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/fang--fake-estate.mp3` | [File:LL-Q1860 (eng)-Fake estate-fang.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fake_estate-fang.wav) | Speaker: Fake estate Recorder: Fake estate | CC BY-SA 4.0 |
| `words/far--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-far.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-far.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/far--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-far.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-far.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/far--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-far.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-far.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/farm--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-farm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-farm.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/farm--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-farm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-farm.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/farm--dvortygirl.mp3` | [File:En-us-farm.ogg](https://commons.wikimedia.org/wiki/File:En-us-farm.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fat--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-fat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-fat.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/fat--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fat.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fat--dvortygirl.mp3` | [File:En-us-fat.ogg](https://commons.wikimedia.org/wiki/File:En-us-fat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fear--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fear.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fear--dvortygirl.mp3` | [File:En-us-fear.ogg](https://commons.wikimedia.org/wiki/File:En-us-fear.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fear--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fear.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/feast--dvortygirl.mp3` | [File:En-us-feast.ogg](https://commons.wikimedia.org/wiki/File:En-us-feast.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/feather--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-feather.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-feather.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/feather--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-feather.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-feather.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/feather--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-feather.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-feather.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/feel--dvortygirl.mp3` | [File:En-us-feel.ogg](https://commons.wikimedia.org/wiki/File:En-us-feel.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/feel--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-feel.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-feel.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/feel--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-feel.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-feel.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/feet--dvortygirl.mp3` | [File:En-us-feet.ogg](https://commons.wikimedia.org/wiki/File:En-us-feet.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/feet--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-feet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-feet.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/feet--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-feet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-feet.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fern--encyclopetey.mp3` | [File:En-us-fern.ogg](https://commons.wikimedia.org/wiki/File:En-us-fern.ogg) | EncycloPetey | CC BY-SA 3.0 |
| `words/fern--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-fern.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-fern.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/fight--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fight.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fight.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fight--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fight.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fight.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fight--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-fight.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-fight.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/fill--dvortygirl.mp3` | [File:En-us-fill.ogg](https://commons.wikimedia.org/wiki/File:En-us-fill.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fill--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fill.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fill.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fill--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fill.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fill.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fire--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fire.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fire.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fire--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Fire.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Fire.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fire--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-fire.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-fire.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/firm--dvortygirl.mp3` | [File:En-us-firm.ogg](https://commons.wikimedia.org/wiki/File:En-us-firm.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/firm--association-shtooka-judi.mp3` | [File:En-uk-firm.ogg](https://commons.wikimedia.org/wiki/File:En-uk-firm.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/firm--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-firm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-firm.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fish--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fish.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fish.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fish--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fish.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fish.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fish--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-fish.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-fish.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/fishy--dvortygirl.mp3` | [File:En-us-fishy.ogg](https://commons.wikimedia.org/wiki/File:En-us-fishy.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fishy--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-fishy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-fishy.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/fishy--commander-keane.mp3` | [File:En-au-fishy.ogg](https://commons.wikimedia.org/wiki/File:En-au-fishy.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/fist--dvortygirl.mp3` | [File:En-us-fist.ogg](https://commons.wikimedia.org/wiki/File:En-us-fist.ogg) | Dvortygirl | Public domain |
| `words/fit--dvortygirl.mp3` | [File:En-us-fit.ogg](https://commons.wikimedia.org/wiki/File:En-us-fit.ogg) | Dvortygirl | Public domain |
| `words/fit--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fit.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fit--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-fit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-fit.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/five--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-five.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-five.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/five--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-five.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-five.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/five--numberone-commonswiki.mp3` | [File:En-us-Five.ogg](https://commons.wikimedia.org/wiki/File:En-us-Five.ogg) | NumberOne~commonswiki | Public domain |
| `words/flee--dvortygirl.mp3` | [File:En-us-flee.ogg](https://commons.wikimedia.org/wiki/File:En-us-flee.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/flower--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-flower.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-flower.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/flower--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-flower.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-flower.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/flower--dvortygirl.mp3` | [File:En-us-flower.ogg](https://commons.wikimedia.org/wiki/File:En-us-flower.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fly--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fly.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fly.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fly--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fly.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fly.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fly--dvortygirl.mp3` | [File:En-us-fly.ogg](https://commons.wikimedia.org/wiki/File:En-us-fly.ogg) | Dvortygirl | Public domain |
| `words/fog--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-fog.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-fog.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/fog--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fog.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fog.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fog--dvortygirl.mp3` | [File:En-us-fog.ogg](https://commons.wikimedia.org/wiki/File:En-us-fog.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fold--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fold.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fold.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fold--dvortygirl.mp3` | [File:En-us-fold.ogg](https://commons.wikimedia.org/wiki/File:En-us-fold.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fold--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-fold.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-fold.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/food--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-food.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-food.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/food--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Food.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Food.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/food--association-shtooka-judi.mp3` | [File:En-uk-food.ogg](https://commons.wikimedia.org/wiki/File:En-uk-food.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/fool--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-fool.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-fool.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/fool--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fool.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fool.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fool--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-fool.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-fool.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/foot--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-foot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-foot.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/foot--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-foot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-foot.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/foot--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-foot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-foot.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/fork--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fork.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-fork.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/fork--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Fork.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Fork.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/fork--dvortygirl.mp3` | [File:En-us-fork.ogg](https://commons.wikimedia.org/wiki/File:En-us-fork.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/four--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-four.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-four.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/four--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-four.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-four.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/four--numberone.mp3` | [File:En-us-Four.ogg](https://commons.wikimedia.org/wiki/File:En-us-Four.ogg) | NumberOne | Public domain |
| `words/fox--dvortygirl.mp3` | [File:En-us-fox.ogg](https://commons.wikimedia.org/wiki/File:En-us-fox.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fox--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fox.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fox.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fox--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-fox.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-fox.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/free--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-free.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-free.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/free--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Free.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Free.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/free--dvortygirl.mp3` | [File:En-us-free.ogg](https://commons.wikimedia.org/wiki/File:En-us-free.ogg) | Dvortygirl | Public domain |
| `words/frog--dvortygirl.mp3` | [File:En-us-frog.ogg](https://commons.wikimedia.org/wiki/File:En-us-frog.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fry--dvortygirl.mp3` | [File:En-us-fry.ogg](https://commons.wikimedia.org/wiki/File:En-us-fry.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fry--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-FRY.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-FRY.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/full--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-full.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-full.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/full--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-full.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-full.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/full--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-full.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-full.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/fun--dvortygirl.mp3` | [File:En-us-fun.ogg](https://commons.wikimedia.org/wiki/File:En-us-fun.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fun--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-fun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-fun.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/fun--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-fun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fun.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/fur--dvortygirl.mp3` | [File:En-us-fur.ogg](https://commons.wikimedia.org/wiki/File:En-us-fur.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/fur--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-fur.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-fur.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/game--dvortygirl.mp3` | [File:En-us-game.ogg](https://commons.wikimedia.org/wiki/File:En-us-game.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/game--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-game.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-game.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/game--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-game.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-game.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/gift--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-gift.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-gift.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/gift--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-gift.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-gift.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/gift--dvortygirl.mp3` | [File:En-us-gift.ogg](https://commons.wikimedia.org/wiki/File:En-us-gift.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/giraffe--dvortygirl.mp3` | [File:En-us-giraffe.ogg](https://commons.wikimedia.org/wiki/File:En-us-giraffe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/giraffe--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-giraffe.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-giraffe.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/giraffe--muldoonsamuel55.mp3` | [File:LL-Q1860 (eng)-Muldoonsamuel55-giraffe.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-giraffe.wav) | Speaker: Muldoonsamuel55 Recorder: Muldoonsamuel55 | CC0 |
| `words/girl--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-girl.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-girl.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/girl--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-girl.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-girl.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/girl--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-girl.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-girl.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/glass--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-glass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-glass.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/glass--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Glass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Glass.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/glass--dvortygirl.mp3` | [File:En-us-glass.ogg](https://commons.wikimedia.org/wiki/File:En-us-glass.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/glove--dvortygirl.mp3` | [File:En-us-glove.ogg](https://commons.wikimedia.org/wiki/File:En-us-glove.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/glove--commander-keane.mp3` | [File:En-au-glove.ogg](https://commons.wikimedia.org/wiki/File:En-au-glove.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/glue--dvortygirl.mp3` | [File:En-us-glue.ogg](https://commons.wikimedia.org/wiki/File:En-us-glue.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/glue--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-glue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-glue.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/glue--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-glue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-glue.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/goat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-goat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-goat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/goat--dvortygirl.mp3` | [File:En-us-goat.ogg](https://commons.wikimedia.org/wiki/File:En-us-goat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/goat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-goat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-goat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/gone--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-gone.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-gone.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/gone--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-gone.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-gone.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/gone--dvortygirl.mp3` | [File:En-us-gone.ogg](https://commons.wikimedia.org/wiki/File:En-us-gone.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/gong--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-gong.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-gong.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/grape--dvortygirl.mp3` | [File:En-us-grape.ogg](https://commons.wikimedia.org/wiki/File:En-us-grape.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/grape--association-shtooka-judi.mp3` | [File:En-uk-grape.ogg](https://commons.wikimedia.org/wiki/File:En-uk-grape.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/grape--louisalphonse28.mp3` | [File:LL-Q1860 (eng)-Louisalphonse28-Grape.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Louisalphonse28-Grape.wav) | Speaker: Louisalphonse28 Recorder: Louisalphonse28 | CC0 |
| `words/grass--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-grass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-grass.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/grass--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-grass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-grass.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/grass--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-grass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-grass.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/green--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-green.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-green.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/green--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-GREEN.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-GREEN.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/green--dvortygirl.mp3` | [File:En-us-green.ogg](https://commons.wikimedia.org/wiki/File:En-us-green.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hail--dvortygirl.mp3` | [File:En-us-hail.ogg](https://commons.wikimedia.org/wiki/File:En-us-hail.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hail--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hail.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hail.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hail--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-hail.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-hail.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/hair--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-hair.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-hair.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/hair--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hair.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hair.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hair--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-hair.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-hair.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/hall--dvortygirl.mp3` | [File:En-us-hall.ogg](https://commons.wikimedia.org/wiki/File:En-us-hall.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hall--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Hall.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Hall.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hall--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hall.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hall.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hand--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-hand.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-hand.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/hand--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hand.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hand.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hand--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-hand.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-hand.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/handy--dvortygirl.mp3` | [File:En-us-handy.ogg](https://commons.wikimedia.org/wiki/File:En-us-handy.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/happy--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-happy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-happy.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/happy--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-happy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-happy.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/happy--dvortygirl.mp3` | [File:En-us-happy.ogg](https://commons.wikimedia.org/wiki/File:En-us-happy.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hard--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-hard.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-hard.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/hard--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hard.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hard.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hard--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-hard.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-hard.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/hat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-hat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-hat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/hat--association-shtooka-judi.mp3` | [File:En-uk-hat.ogg](https://commons.wikimedia.org/wiki/File:En-uk-hat.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/hat--dvortygirl.mp3` | [File:En-us-hat.ogg](https://commons.wikimedia.org/wiki/File:En-us-hat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/head--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-head.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-head.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/head--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-head.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-head.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/head--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-head.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-head.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/hear--dvortygirl.mp3` | [File:En-us-hear.ogg](https://commons.wikimedia.org/wiki/File:En-us-hear.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hear--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hear.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hear--chris-melville.mp3` | [File:En-uk-hear.ogg](https://commons.wikimedia.org/wiki/File:En-uk-hear.ogg) | Chris Melville | Public domain |
| `words/heart--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-heart.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-heart.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/heart--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Heart.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Heart.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/heart--dvortygirl.mp3` | [File:En-us-heart.ogg](https://commons.wikimedia.org/wiki/File:En-us-heart.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/heat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-heat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-heat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/heat--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-heat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-heat.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/heat--dvortygirl.mp3` | [File:En-us-heat.ogg](https://commons.wikimedia.org/wiki/File:En-us-heat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/heel--dvortygirl.mp3` | [File:En-us-heel.ogg](https://commons.wikimedia.org/wiki/File:En-us-heel.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/height--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-height.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-height.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/height--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-height.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-height.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/height--dvortygirl.mp3` | [File:En-us-height.ogg](https://commons.wikimedia.org/wiki/File:En-us-height.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hen--dvortygirl.mp3` | [File:En-us-hen.ogg](https://commons.wikimedia.org/wiki/File:En-us-hen.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hen--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-hen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-hen.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/her--dvortygirl.mp3` | [File:En-us-her.ogg](https://commons.wikimedia.org/wiki/File:En-us-her.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/her--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Her.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Her.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/her--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-her.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-her.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/herd--neskaya.mp3` | [File:En-us-herd.ogg](https://commons.wikimedia.org/wiki/File:En-us-herd.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/hill--dvortygirl.mp3` | [File:En-us-hill.ogg](https://commons.wikimedia.org/wiki/File:En-us-hill.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hill--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hill.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hill.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hill--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-hill.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-hill.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/hire--dvortygirl.mp3` | [File:En-us-hire.ogg](https://commons.wikimedia.org/wiki/File:En-us-hire.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hire--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-hire.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-hire.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/hire--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hire.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hire.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/his--recorded-by-dvortygirl.mp3` | [File:En-us-his.ogg](https://commons.wikimedia.org/wiki/File:En-us-his.ogg) | recorded by Dvortygirl | CC BY-SA 3.0 |
| `words/his--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-His.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-His.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/his--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-his.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-his.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hit--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hit.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hit--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-hit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-hit.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/hit--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hit.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hog--droesperanto.mp3` | [File:En-us-hog.ogg](https://commons.wikimedia.org/wiki/File:En-us-hog.ogg) | DroEsperanto | Public domain |
| `words/hold--dvortygirl.mp3` | [File:En-us-hold.ogg](https://commons.wikimedia.org/wiki/File:En-us-hold.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hold--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hold.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hold.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hold--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hold.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hold.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hood--neskaya.mp3` | [File:En-us-hood.ogg](https://commons.wikimedia.org/wiki/File:En-us-hood.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/hood--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hood.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hood.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/horse--dvortygirl.mp3` | [File:En-us-horse.ogg](https://commons.wikimedia.org/wiki/File:En-us-horse.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/horse--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-horse.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-horse.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/horse--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-horse.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-horse.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hot--dvortygirl.mp3` | [File:En-us-hot.ogg](https://commons.wikimedia.org/wiki/File:En-us-hot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hot--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hot.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hot--association-shtooka-judi.mp3` | [File:En-uk-hot.ogg](https://commons.wikimedia.org/wiki/File:En-uk-hot.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/house--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-house.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-house.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/house--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-house.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-house.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/house--association-shtooka-judi.mp3` | [File:En-uk-house.ogg](https://commons.wikimedia.org/wiki/File:En-uk-house.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/hug--dvortygirl.mp3` | [File:En-us-hug.ogg](https://commons.wikimedia.org/wiki/File:En-us-hug.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hug--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hug.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hug.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hum--neskaya.mp3` | [File:En-us-hum.ogg](https://commons.wikimedia.org/wiki/File:En-us-hum.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/hum--alfonsius26.mp3` | [File:LL-Q1860 (eng)-ALFONSIUS26-Hum.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-ALFONSIUS26-Hum.wav) | Speaker: ALFONSIUS26 Recorder: ALFONSIUS26 | CC0 |
| `words/hun--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-hun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-hun.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/hun--fake-estate.mp3` | [File:LL-Q1860 (eng)-Fake estate-hun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fake_estate-hun.wav) | Speaker: Fake estate Recorder: Fake estate | CC BY-SA 4.0 |
| `words/hurt--dvortygirl.mp3` | [File:En-us-hurt.ogg](https://commons.wikimedia.org/wiki/File:En-us-hurt.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/hurt--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-hurt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-hurt.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/hurt--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-hurt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-hurt.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/hut--dvortygirl.mp3` | [File:En-us-hut.ogg](https://commons.wikimedia.org/wiki/File:En-us-hut.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ice--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-ice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-ice.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/ice--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-ice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-ice.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/ice--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-ice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-ice.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/jam--dvortygirl.mp3` | [File:En-us-jam.ogg](https://commons.wikimedia.org/wiki/File:En-us-jam.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/jam--association-shtooka-judi.mp3` | [File:En-uk-jam.ogg](https://commons.wikimedia.org/wiki/File:En-uk-jam.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/jam--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-jam.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-jam.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/jar--dvortygirl.mp3` | [File:En-us-jar.ogg](https://commons.wikimedia.org/wiki/File:En-us-jar.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/jar--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Jar.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Jar.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/jar--commander-keane.mp3` | [File:En-au-jar.ogg](https://commons.wikimedia.org/wiki/File:En-au-jar.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/jeep--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-Jeep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-Jeep.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/jeep--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-jeep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-jeep.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/jeep--k6ka.mp3` | [File:En-ca-jeep.oga](https://commons.wikimedia.org/wiki/File:En-ca-jeep.oga) | K6ka | CC0 |
| `words/jet--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-jet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-jet.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/jet--commander-keane.mp3` | [File:En-au-jet.ogg](https://commons.wikimedia.org/wiki/File:En-au-jet.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/juice--dominic.mp3` | [File:En-us-juice.ogg](https://commons.wikimedia.org/wiki/File:En-us-juice.ogg) | Dominic | Public domain |
| `words/juice--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-juice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-juice.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/juice--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-juice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-juice.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/jump--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-jump.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-jump.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/jump--treemama.mp3` | [File:En-us-jump.ogg](https://commons.wikimedia.org/wiki/File:En-us-jump.ogg) | TreeMama | CC BY-SA 3.0 |
| `words/jump--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-jump.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-jump.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/key--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-key.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-key.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/key--association-shtooka-judi.mp3` | [File:En-uk-key.ogg](https://commons.wikimedia.org/wiki/File:En-uk-key.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/key--dvortygirl.mp3` | [File:En-us-key.ogg](https://commons.wikimedia.org/wiki/File:En-us-key.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/kick--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-kick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-kick.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/kick--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-kick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-kick.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/kick--dvortygirl.mp3` | [File:En-us-kick.ogg](https://commons.wikimedia.org/wiki/File:En-us-kick.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/kin--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-kin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-kin.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/kin--fake-estate.mp3` | [File:LL-Q1860 (eng)-Fake estate-kin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fake_estate-kin.wav) | Speaker: Fake estate Recorder: Fake estate | CC BY-SA 4.0 |
| `words/king--dvortygirl.mp3` | [File:En-us-king.ogg](https://commons.wikimedia.org/wiki/File:En-us-king.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/king--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-king.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-king.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/king--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-king.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-king.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/kite--mx-granger.mp3` | [File:En-us-kite.ogg](https://commons.wikimedia.org/wiki/File:En-us-kite.ogg) | Mx. Granger | CC0 |
| `words/knee--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-knee.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-knee.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/knee--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-knee.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-knee.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/knee--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-knee.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-knee.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/knife--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-knife.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-knife.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/knife--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Knife.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Knife.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/knife--dvortygirl.mp3` | [File:En-us-knife.ogg](https://commons.wikimedia.org/wiki/File:En-us-knife.ogg) | Dvortygirl | Public domain |
| `words/knit--celestianpower.mp3` | [File:En-uk-knit.ogg](https://commons.wikimedia.org/wiki/File:En-uk-knit.ogg) | Celestianpower | Public domain |
| `words/kooky--commander-keane.mp3` | [File:En-au-kooky.ogg](https://commons.wikimedia.org/wiki/File:En-au-kooky.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/lace--dvortygirl.mp3` | [File:En-us-lace.ogg](https://commons.wikimedia.org/wiki/File:En-us-lace.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lack--dvortygirl.mp3` | [File:En-us-lack.ogg](https://commons.wikimedia.org/wiki/File:En-us-lack.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lack--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-lack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-lack.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/lack--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-lack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-lack.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/ladder--dvortygirl.mp3` | [File:En-us-ladder.ogg](https://commons.wikimedia.org/wiki/File:En-us-ladder.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ladder--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-ladder.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-ladder.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/ladder--commander-keane.mp3` | [File:En-au-ladder.ogg](https://commons.wikimedia.org/wiki/File:En-au-ladder.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/lake--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-lake.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-lake.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/lake--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-lake.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-lake.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/lake--dvortygirl.mp3` | [File:En-us-lake.ogg](https://commons.wikimedia.org/wiki/File:En-us-lake.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lamb--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-lamb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-lamb.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/lamb--dvortygirl.mp3` | [File:En-us-lamb.ogg](https://commons.wikimedia.org/wiki/File:En-us-lamb.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lamp--dvortygirl.mp3` | [File:En-us-lamp.ogg](https://commons.wikimedia.org/wiki/File:En-us-lamp.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lamp--association-shtooka-judi.mp3` | [File:En-uk-lamp.ogg](https://commons.wikimedia.org/wiki/File:En-uk-lamp.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/lamp--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-lamp.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-lamp.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/lane--dvortygirl.mp3` | [File:En-us-lane.ogg](https://commons.wikimedia.org/wiki/File:En-us-lane.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lane--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-lane.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-lane.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/lather--dvortygirl.mp3` | [File:En-us-lather.ogg](https://commons.wikimedia.org/wiki/File:En-us-lather.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lather--commander-keane.mp3` | [File:En-au-lather.ogg](https://commons.wikimedia.org/wiki/File:En-au-lather.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/laugh--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-laugh.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-laugh.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/laugh--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-laugh.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-laugh.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/laugh--dvortygirl.mp3` | [File:En-us-laugh.ogg](https://commons.wikimedia.org/wiki/File:En-us-laugh.ogg) | Dvortygirl | Public domain |
| `words/law--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-law.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-law.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/law--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-law.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-law.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/law--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-law.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-law.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/leaf--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-leaf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-leaf.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/leaf--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-leaf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-leaf.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/leaf--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-leaf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-leaf.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/leap--neskaya.mp3` | [File:En-us-leap.ogg](https://commons.wikimedia.org/wiki/File:En-us-leap.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/leap--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-leap.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-leap.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/leave--dvortygirl.mp3` | [File:En-us-leave.ogg](https://commons.wikimedia.org/wiki/File:En-us-leave.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/leave--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-leave.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-leave.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/leave--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-leave.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-leave.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/led--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-led.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-led.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/led--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-led.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-led.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/led--dvortygirl.mp3` | [File:En-us-led.ogg](https://commons.wikimedia.org/wiki/File:En-us-led.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/leg--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-leg.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-leg.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/leg--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-leg.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-leg.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/leg--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-leg.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-leg.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/lemon--association-shtooka-judi.mp3` | [File:En-uk-lemon.ogg](https://commons.wikimedia.org/wiki/File:En-uk-lemon.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/lemon--louisalphonse28.mp3` | [File:LL-Q1860 (eng)-Louisalphonse28-Lemon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Louisalphonse28-Lemon.wav) | Speaker: Louisalphonse28 Recorder: Louisalphonse28 | CC0 |
| `words/lemon--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-lemon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-lemon.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/lice--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-lice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-lice.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/lice--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-lice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-lice.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/lid--neskaya.mp3` | [File:En-us-lid.ogg](https://commons.wikimedia.org/wiki/File:En-us-lid.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/lid--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-lid.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-lid.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/lid--commander-keane.mp3` | [File:En-au-lid.ogg](https://commons.wikimedia.org/wiki/File:En-au-lid.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/light--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-light.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-light.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/light--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-light.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-light.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/light--dvortygirl.mp3` | [File:En-us-light.ogg](https://commons.wikimedia.org/wiki/File:En-us-light.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lion--dvortygirl.mp3` | [File:En-us-lion.ogg](https://commons.wikimedia.org/wiki/File:En-us-lion.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lion--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-lion.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-lion.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/lion--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-lion.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-lion.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/lip--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-lip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-lip.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/lip--dvortygirl.mp3` | [File:En-us-lip.ogg](https://commons.wikimedia.org/wiki/File:En-us-lip.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lip--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-lip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-lip.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/load--sylvanmoon.mp3` | [File:En-us-load.ogg](https://commons.wikimedia.org/wiki/File:En-us-load.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/load--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-load.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-load.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/load--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-load.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-load.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/lock--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-lock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-lock.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/lock--dvortygirl.mp3` | [File:En-us-lock.ogg](https://commons.wikimedia.org/wiki/File:En-us-lock.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lock--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-lock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-lock.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/log--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-log.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-log.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/log--dvortygirl.mp3` | [File:En-us-log.ogg](https://commons.wikimedia.org/wiki/File:En-us-log.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/long--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-long.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-long.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/long--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-long.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-long.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/long--association-shtooka-judi.mp3` | [File:En-uk-long.ogg](https://commons.wikimedia.org/wiki/File:En-uk-long.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/look--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-look.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-look.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/look--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-look.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-look.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/look--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-look.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-look.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/loom--dvortygirl.mp3` | [File:En-us-loom.ogg](https://commons.wikimedia.org/wiki/File:En-us-loom.ogg) | Dvortygirl | Public domain |
| `words/low--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-low.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-low.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/low--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-low.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-low.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/low--dvortygirl.mp3` | [File:En-us-low.ogg](https://commons.wikimedia.org/wiki/File:En-us-low.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/luck--dvortygirl.mp3` | [File:En-us-luck.ogg](https://commons.wikimedia.org/wiki/File:En-us-luck.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/luck--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-luck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-luck.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/luck--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-luck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-luck.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/lucky--dvortygirl.mp3` | [File:En-us-lucky.ogg](https://commons.wikimedia.org/wiki/File:En-us-lucky.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/lucky--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-lucky.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-lucky.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/lucky--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-lucky.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-lucky.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/mad--dvortygirl.mp3` | [File:En-us-mad.ogg](https://commons.wikimedia.org/wiki/File:En-us-mad.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mad--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-mad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-mad.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/mad--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-mad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-mad.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/man--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-man.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-man.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/man--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-man.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-man.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/man--dvortygirl.mp3` | [File:En-us-Man.ogg](https://commons.wikimedia.org/wiki/File:En-us-Man.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/map--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-map.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-map.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/map--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-map.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-map.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/map--dvortygirl.mp3` | [File:En-us-map.ogg](https://commons.wikimedia.org/wiki/File:En-us-map.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/marble--dvortygirl.mp3` | [File:En-us-marble.ogg](https://commons.wikimedia.org/wiki/File:En-us-marble.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/marble--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Marble.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Marble.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/marvel--neskaya.mp3` | [File:En-us-marvel.ogg](https://commons.wikimedia.org/wiki/File:En-us-marvel.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/marvel--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-marvel.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-marvel.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/mash--sylvanmoon.mp3` | [File:En-us-mash.ogg](https://commons.wikimedia.org/wiki/File:En-us-mash.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/mass--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-mass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-mass.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/mass--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-mass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-mass.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/mass--dvortygirl.mp3` | [File:En-us-mass.ogg](https://commons.wikimedia.org/wiki/File:En-us-mass.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mat--dvortygirl.mp3` | [File:En-us-mat.ogg](https://commons.wikimedia.org/wiki/File:En-us-mat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mat--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Mat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Mat.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/match--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-match.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-match.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/match--association-shtooka-judi.mp3` | [File:En-uk-match.ogg](https://commons.wikimedia.org/wiki/File:En-uk-match.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/match--dvortygirl.mp3` | [File:En-us-match.ogg](https://commons.wikimedia.org/wiki/File:En-us-match.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/math--dvortygirl.mp3` | [File:En-us-math.ogg](https://commons.wikimedia.org/wiki/File:En-us-math.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/math--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-math.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-math.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/math--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-math.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-math.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/measure--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-measure.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-measure.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/measure--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-measure.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-measure.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/measure--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-measure.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-measure.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/meat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-meat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-meat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/meat--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-meat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-meat.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/meat--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-meat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-meat.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/melon--dvortygirl.mp3` | [File:En-us-melon.ogg](https://commons.wikimedia.org/wiki/File:En-us-melon.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/melon--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-melon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-melon.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/melon--commander-keane.mp3` | [File:En-au-melon.ogg](https://commons.wikimedia.org/wiki/File:En-au-melon.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/milk--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-milk.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-milk.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/milk--association-shtooka-judi.mp3` | [File:En-uk-milk.ogg](https://commons.wikimedia.org/wiki/File:En-uk-milk.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/milk--dvortygirl.mp3` | [File:En-us-milk.ogg](https://commons.wikimedia.org/wiki/File:En-us-milk.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/milky--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-milky.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-milky.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/milky--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-milky.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-milky.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/mitt--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-mitt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-mitt.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/mom--dvortygirl.mp3` | [File:En-us-mom.ogg](https://commons.wikimedia.org/wiki/File:En-us-mom.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mom--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-mom.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-mom.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/mom--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-mom.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-mom.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/monkey--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-monkey.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-monkey.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/monkey--dvortygirl.mp3` | [File:En-us-monkey.ogg](https://commons.wikimedia.org/wiki/File:En-us-monkey.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/monkey--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-monkey.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-monkey.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/moon--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-moon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-moon.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/moon--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-moon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-moon.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/moon--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-moon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-moon.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/moss--dvortygirl.mp3` | [File:En-us-moss.ogg](https://commons.wikimedia.org/wiki/File:En-us-moss.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/moth--dvortygirl.mp3` | [File:En-us-moth.ogg](https://commons.wikimedia.org/wiki/File:En-us-moth.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/moth--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-moth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-moth.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/mother--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-mother.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-mother.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/mother--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-mother.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-mother.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/mother--dvortygirl.mp3` | [File:En-us-mother.ogg](https://commons.wikimedia.org/wiki/File:En-us-mother.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mouse--dvortygirl.mp3` | [File:En-us-mouse.ogg](https://commons.wikimedia.org/wiki/File:En-us-mouse.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mouse--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-mouse.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-mouse.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/mouth--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-mouth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-mouth.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/mouth--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-mouth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-mouth.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/mouth--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-mouth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-mouth.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/much--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-much.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-much.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/much--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Much.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Much.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/much--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-much.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-much.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/mud--dvortygirl.mp3` | [File:En-us-mud.ogg](https://commons.wikimedia.org/wiki/File:En-us-mud.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mud--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-mud.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-mud.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/mug--dvortygirl.mp3` | [File:En-us-mug.ogg](https://commons.wikimedia.org/wiki/File:En-us-mug.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/mug--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Mug.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Mug.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/mug--commander-keane.mp3` | [File:En-au-mug.ogg](https://commons.wikimedia.org/wiki/File:En-au-mug.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/neat--dvortygirl.mp3` | [File:En-us-neat.ogg](https://commons.wikimedia.org/wiki/File:En-us-neat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/nest--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-nest.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-nest.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/nest--shubham-kr-soni.mp3` | [File:LL-Q1860 (eng)-SHUBHAM KR SONI-nest.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-SHUBHAM_KR_SONI-nest.wav) | Speaker: SHUBHAM KR SONI Recorder: SHUBHAM KR SONI | CC0 |
| `words/nest--dvortygirl.mp3` | [File:En-us-nest.ogg](https://commons.wikimedia.org/wiki/File:En-us-nest.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/net--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-net.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-net.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/net--dvortygirl.mp3` | [File:En-us-net.ogg](https://commons.wikimedia.org/wiki/File:En-us-net.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/net--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-net.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-net.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/nine--numberone-commonswiki.mp3` | [File:En-us-Nine.ogg](https://commons.wikimedia.org/wiki/File:En-us-Nine.ogg) | NumberOne~commonswiki | Public domain |
| `words/nine--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-nine.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-nine.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/nine--thedaveross.mp3` | [File:En-us-nine.ogg](https://commons.wikimedia.org/wiki/File:En-us-nine.ogg) | TheDaveRoss | CC BY-SA 3.0 |
| `words/nook--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-nook.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-nook.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/nook--vininn126.mp3` | [File:LL-Q1860 (eng)-Vininn126-nook.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vininn126-nook.wav) | Speaker: Vininn126 Recorder: Vininn126 | CC BY-SA 4.0 |
| `words/nose--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-nose.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-nose.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/nose--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-nose.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-nose.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/nose--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-nose.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-nose.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/nuke--commander-keane.mp3` | [File:En-au-nuke.ogg](https://commons.wikimedia.org/wiki/File:En-au-nuke.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/nurse--dvortygirl.mp3` | [File:En-us-nurse.ogg](https://commons.wikimedia.org/wiki/File:En-us-nurse.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/nurse--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-nurse.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-nurse.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/nurse--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-nurse.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-nurse.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/nut--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-nut.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-nut.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/nut--dvortygirl.mp3` | [File:En-us-nut.ogg](https://commons.wikimedia.org/wiki/File:En-us-nut.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/octopus--dvortygirl.mp3` | [File:En-us-octopus.ogg](https://commons.wikimedia.org/wiki/File:En-us-octopus.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/octopus--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-octopus.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-octopus.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/oil--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-oil.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-oil.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/oil--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Oil.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Oil.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/oil--dvortygirl.mp3` | [File:En-us-oil.ogg](https://commons.wikimedia.org/wiki/File:En-us-oil.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/one--numberone-commonswiki.mp3` | [File:En-us-One.ogg](https://commons.wikimedia.org/wiki/File:En-us-One.ogg) | NumberOne~commonswiki | Public domain |
| `words/one--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-One.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-One.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/one--dvortygirl.mp3` | [File:En-us-one.ogg](https://commons.wikimedia.org/wiki/File:En-us-one.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/onion--dvortygirl.mp3` | [File:En-us-onion.ogg](https://commons.wikimedia.org/wiki/File:En-us-onion.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/onion--association-shtooka-judi.mp3` | [File:En-uk-onion.ogg](https://commons.wikimedia.org/wiki/File:En-uk-onion.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/orange--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-orange.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-orange.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/orange--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-ORANGE.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-ORANGE.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/orange--association-shtooka-judi.mp3` | [File:En-uk-orange.ogg](https://commons.wikimedia.org/wiki/File:En-uk-orange.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/other--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-other.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-other.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/other--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-other.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-other.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/other--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-other.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-other.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/owl--dvortygirl.mp3` | [File:En-us-owl.ogg](https://commons.wikimedia.org/wiki/File:En-us-owl.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/owl--fabricio-cardenas-biblio.mp3` | [File:LL-Q1860 (eng)-Fabricio Cardenas (BiblioCanet66)-owl.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fabricio_Cardenas_(BiblioCanet66)-owl.wav) | Speaker: Fabricio Cardenas Recorder: BiblioCanet66 | CC BY-SA 4.0 |
| `words/pan--dvortygirl.mp3` | [File:En-us-pan.ogg](https://commons.wikimedia.org/wiki/File:En-us-pan.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pan--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-Pan.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-Pan.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/pan--scelultrix.mp3` | [File:LL-Q1860 (eng)-Scelultrix-pan.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Scelultrix-pan.wav) | Speaker: Scelultrix Recorder: Scelultrix | CC0 |
| `words/panda--dvortygirl.mp3` | [File:En-us-panda.ogg](https://commons.wikimedia.org/wiki/File:En-us-panda.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pang--commander-keane.mp3` | [File:En-au-pang.ogg](https://commons.wikimedia.org/wiki/File:En-au-pang.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/parch--dvortygirl.mp3` | [File:En-us-parch.ogg](https://commons.wikimedia.org/wiki/File:En-us-parch.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/parse--sylvanmoon.mp3` | [File:En-us-parse.ogg](https://commons.wikimedia.org/wiki/File:En-us-parse.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/parse--commander-keane.mp3` | [File:En-au-parse.ogg](https://commons.wikimedia.org/wiki/File:En-au-parse.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/part--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-part.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-part.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/part--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-part.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-part.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/part--dvortygirl.mp3` | [File:En-us-part.ogg](https://commons.wikimedia.org/wiki/File:En-us-part.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pass--dvortygirl.mp3` | [File:En-us-pass.ogg](https://commons.wikimedia.org/wiki/File:En-us-pass.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pass--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-pass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-pass.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/pass--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pass.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pass.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pat--dvortygirl.mp3` | [File:En-us-pat.ogg](https://commons.wikimedia.org/wiki/File:En-us-pat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pat--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-pat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-pat.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY 4.0 |
| `words/pat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/path--dvortygirl.mp3` | [File:En-us-path.ogg](https://commons.wikimedia.org/wiki/File:En-us-path.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/path--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-path.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-path.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/path--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-path.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-path.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/peach--dvortygirl.mp3` | [File:En-us-peach.ogg](https://commons.wikimedia.org/wiki/File:En-us-peach.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/peach--louisalphonse28.mp3` | [File:LL-Q1860 (eng)-Louisalphonse28-Peach.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Louisalphonse28-Peach.wav) | Speaker: Louisalphonse28 Recorder: Louisalphonse28 | CC0 |
| `words/peak--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-peak.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-peak.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/pear--dvortygirl.mp3` | [File:En-us-pear.ogg](https://commons.wikimedia.org/wiki/File:En-us-pear.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pear--association-shtooka-judi.mp3` | [File:En-uk-pear.ogg](https://commons.wikimedia.org/wiki/File:En-uk-pear.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/pear--louisalphonse28.mp3` | [File:LL-Q1860 (eng)-Louisalphonse28-Pear.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Louisalphonse28-Pear.wav) | Speaker: Louisalphonse28 Recorder: Louisalphonse28 | CC0 |
| `words/peel--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-peel.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-peel.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/peel--commander-keane.mp3` | [File:En-au-peel.ogg](https://commons.wikimedia.org/wiki/File:En-au-peel.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/pen--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-pen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-pen.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/pen--dvortygirl.mp3` | [File:En-us-pen.ogg](https://commons.wikimedia.org/wiki/File:En-us-pen.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pen--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pen.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/perch--dvortygirl.mp3` | [File:En-us-perch.ogg](https://commons.wikimedia.org/wiki/File:En-us-perch.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pert--m-lange-a-trois.mp3` | [File:LL-Q1860 (eng)-Mélange a trois-pert.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-M%C3%A9lange_a_trois-pert.wav) | Speaker: Mélange a trois Recorder: Mélange a trois | CC BY-SA 4.0 |
| `words/phone--dvortygirl.mp3` | [File:En-us-phone.ogg](https://commons.wikimedia.org/wiki/File:En-us-phone.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/phone--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Phone.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Phone.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/phone--association-shtooka-judi.mp3` | [File:En-uk-phone.ogg](https://commons.wikimedia.org/wiki/File:En-uk-phone.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/pick--dvortygirl.mp3` | [File:En-us-pick.ogg](https://commons.wikimedia.org/wiki/File:En-us-pick.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pick--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-pick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-pick.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/pick--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pick.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pie--dvortygirl.mp3` | [File:En-us-pie.ogg](https://commons.wikimedia.org/wiki/File:En-us-pie.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pie--manjiroll.mp3` | [File:LL-Q1860 (eng)-ManjiroLL-pie.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-ManjiroLL-pie.wav) | Speaker: ManjiroLL Recorder: ManjiroLL | CC0 |
| `words/pie--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pie.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pie.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pig--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-pig.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-pig.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/pig--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-PIG.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-PIG.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/pig--dvortygirl.mp3` | [File:En-us-pig.ogg](https://commons.wikimedia.org/wiki/File:En-us-pig.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pill--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-pill.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-pill.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/pill--dvortygirl.mp3` | [File:En-us-pill.ogg](https://commons.wikimedia.org/wiki/File:En-us-pill.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pilot--neskaya.mp3` | [File:En-us-pilot.ogg](https://commons.wikimedia.org/wiki/File:En-us-pilot.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/pilot--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pilot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pilot.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pilot--commander-keane.mp3` | [File:En-au-pilot.ogg](https://commons.wikimedia.org/wiki/File:En-au-pilot.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/pin--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-pin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-pin.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/pin--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pin.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pin--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-pin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-pin.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/pink--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pink.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pink.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pink--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-pink.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-pink.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/pink--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-pink.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-pink.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/pirate--neskaya.mp3` | [File:En-us-pirate.ogg](https://commons.wikimedia.org/wiki/File:En-us-pirate.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/pizza--dvortygirl.mp3` | [File:En-us-pizza.ogg](https://commons.wikimedia.org/wiki/File:En-us-pizza.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pizza--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Pizza.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Pizza.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/pizza--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pizza.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pizza.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/play--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-play.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-play.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/play--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-play.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-play.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/play--dvortygirl.mp3` | [File:En-us-play.ogg](https://commons.wikimedia.org/wiki/File:En-us-play.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pool--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-pool.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-pool.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/pool--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pool.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pool.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pool--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-pool.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-pool.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/pot--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-pot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-pot.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/pot--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Pot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Pot.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/pot--dvortygirl.mp3` | [File:En-us-pot.ogg](https://commons.wikimedia.org/wiki/File:En-us-pot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pray--dvortygirl.mp3` | [File:En-us-pray.ogg](https://commons.wikimedia.org/wiki/File:En-us-pray.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/pray--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-pray.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-pray.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/pray--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-pray.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-pray.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/pull--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-pull.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-pull.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/pull--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-pull.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-pull.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/pull--dvortygirl.mp3` | [File:En-us-pull.ogg](https://commons.wikimedia.org/wiki/File:En-us-pull.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/purple--dvortygirl.mp3` | [File:En-us-purple.ogg](https://commons.wikimedia.org/wiki/File:En-us-purple.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/purple--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-purple.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-purple.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/purse--neskaya.mp3` | [File:En-us-purse.ogg](https://commons.wikimedia.org/wiki/File:En-us-purse.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/purse--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-purse.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-purse.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/push--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-push.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-push.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/push--dvortygirl.mp3` | [File:En-us-push.ogg](https://commons.wikimedia.org/wiki/File:En-us-push.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/push--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-push.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-push.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/putt--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-putt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-putt.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/putt--commander-keane.mp3` | [File:En-au-putt.ogg](https://commons.wikimedia.org/wiki/File:En-au-putt.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/queen--dvortygirl.mp3` | [File:En-us-queen.ogg](https://commons.wikimedia.org/wiki/File:En-us-queen.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/queen--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-queen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-queen.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/queen--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-queen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-queen.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/rabbit--dvortygirl.mp3` | [File:En-us-rabbit.ogg](https://commons.wikimedia.org/wiki/File:En-us-rabbit.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rabbit--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rabbit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rabbit.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rabbit--commander-keane.mp3` | [File:En-au-rabbit.ogg](https://commons.wikimedia.org/wiki/File:En-au-rabbit.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/race--dvortygirl.mp3` | [File:En-us-race.ogg](https://commons.wikimedia.org/wiki/File:En-us-race.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/race--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-race.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-race.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/race--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-race.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-race.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rain--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-rain.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-rain.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/rain--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-rain.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-rain.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/rain--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-rain.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-rain.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/rainbow--dvortygirl.mp3` | [File:En-us-rainbow.ogg](https://commons.wikimedia.org/wiki/File:En-us-rainbow.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rainbow--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Rainbow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Rainbow.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/rainy--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-rainy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-rainy.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/rainy--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-rainy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-rainy.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/rainy--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-rainy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-rainy.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/rake--dvortygirl.mp3` | [File:En-us-rake.ogg](https://commons.wikimedia.org/wiki/File:En-us-rake.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ran--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-ran.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-ran.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/ran--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-ran.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-ran.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/ran--dvortygirl.mp3` | [File:En-us-ran.ogg](https://commons.wikimedia.org/wiki/File:En-us-ran.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rang--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-rang.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-rang.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/rang--dvortygirl.mp3` | [File:En-us-rang.ogg](https://commons.wikimedia.org/wiki/File:En-us-rang.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rang--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rang.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rang.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rat--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-rat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-rat.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/rat--dvortygirl.mp3` | [File:En-us-rat.ogg](https://commons.wikimedia.org/wiki/File:En-us-rat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/raw--dvortygirl.mp3` | [File:En-us-raw.ogg](https://commons.wikimedia.org/wiki/File:En-us-raw.ogg) | Dvortygirl | Public domain |
| `words/raw--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-raw.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-raw.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/reach--dvortygirl.mp3` | [File:En-us-reach.ogg](https://commons.wikimedia.org/wiki/File:En-us-reach.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/reach--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-reach.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-reach.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/reach--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-reach.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-reach.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/red--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-red.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-red.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/red--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-RED.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-RED.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/red--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-red.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-red.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/rib--dvortygirl.mp3` | [File:En-us-rib.ogg](https://commons.wikimedia.org/wiki/File:En-us-rib.ogg) | Dvortygirl | Public domain |
| `words/rice--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-rice.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-rice.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/rice--association-shtooka-judi.mp3` | [File:En-uk-rice.ogg](https://commons.wikimedia.org/wiki/File:En-uk-rice.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/rice--dvortygirl.mp3` | [File:En-us-rice.ogg](https://commons.wikimedia.org/wiki/File:En-us-rice.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rich--dvortygirl.mp3` | [File:En-us-rich.ogg](https://commons.wikimedia.org/wiki/File:En-us-rich.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rich--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rich.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rich.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rich--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-rich.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-rich.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/rid--dvortygirl.mp3` | [File:En-us-rid.ogg](https://commons.wikimedia.org/wiki/File:En-us-rid.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rid--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rid.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rid.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rid--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-rid.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-rid.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/ride--dvortygirl.mp3` | [File:En-us-ride.ogg](https://commons.wikimedia.org/wiki/File:En-us-ride.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ride--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-ride.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-ride.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/ride--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-ride.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-ride.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/right--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-right.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-right.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/right--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-right.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-right.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/right--dvortygirl.mp3` | [File:En-us-right.ogg](https://commons.wikimedia.org/wiki/File:En-us-right.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ring--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-ring.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-ring.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/ring--dvortygirl.mp3` | [File:En-us-ring.ogg](https://commons.wikimedia.org/wiki/File:En-us-ring.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ring--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-ring.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-ring.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rip--dvortygirl.mp3` | [File:En-us-rip.ogg](https://commons.wikimedia.org/wiki/File:En-us-rip.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rip--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-RIP.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-RIP.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/rip--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rip.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/road--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-road.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-road.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/road--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-road.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-road.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/road--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-road.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-road.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/robe--dvortygirl.mp3` | [File:En-us-robe.ogg](https://commons.wikimedia.org/wiki/File:En-us-robe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/robot--dvortygirl.mp3` | [File:En-us-robot.ogg](https://commons.wikimedia.org/wiki/File:En-us-robot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/robot--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-robot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-robot.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/robot--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-robot.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-robot.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rock--dvortygirl.mp3` | [File:En-us-rock.ogg](https://commons.wikimedia.org/wiki/File:En-us-rock.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rock--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Rock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Rock.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/rock--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rock.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rocket--dvortygirl.mp3` | [File:En-us-rocket.ogg](https://commons.wikimedia.org/wiki/File:En-us-rocket.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rocket--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rocket.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rocket.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/room--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-room.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-room.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/room--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-room.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-room.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/room--dvortygirl.mp3` | [File:En-us-room.ogg](https://commons.wikimedia.org/wiki/File:En-us-room.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rope--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-rope.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-rope.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/rope--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-rope.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-rope.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/rope--dvortygirl.mp3` | [File:En-us-rope.ogg](https://commons.wikimedia.org/wiki/File:En-us-rope.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rot--dvortygirl.mp3` | [File:En-us-rot.ogg](https://commons.wikimedia.org/wiki/File:En-us-rot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rove--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-rove.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-rove.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/run--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-run.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-run.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/run--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Run.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Run.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/run--dvortygirl.mp3` | [File:En-us-run.ogg](https://commons.wikimedia.org/wiki/File:En-us-run.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/rung--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-rung.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-rung.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/rung--sylvanmoon.mp3` | [File:En-us-rung.ogg](https://commons.wikimedia.org/wiki/File:En-us-rung.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/rung--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-rung.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rung.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/rut--paul2520.mp3` | [File:En-us-rut.ogg](https://commons.wikimedia.org/wiki/File:En-us-rut.ogg) | Paul2520 | CC0 |
| `words/rut--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-rut.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-rut.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/sack--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-sack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-sack.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/sack--dvortygirl.mp3` | [File:En-us-sack.ogg](https://commons.wikimedia.org/wiki/File:En-us-sack.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sack--commander-keane.mp3` | [File:En-au-sack.ogg](https://commons.wikimedia.org/wiki/File:En-au-sack.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/sad--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sad.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sad--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Sad.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Sad.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sad--dvortygirl.mp3` | [File:En-us-sad.ogg](https://commons.wikimedia.org/wiki/File:En-us-sad.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/salt--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-salt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-salt.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/salt--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-salt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-salt.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/salt--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-salt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-salt.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/salty--commander-keane.mp3` | [File:En-au-salty.ogg](https://commons.wikimedia.org/wiki/File:En-au-salty.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/sand--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sand.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sand.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sand--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sand.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sand.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sand--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-sand.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-sand.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/sandy--dvortygirl.mp3` | [File:En-us-sandy.ogg](https://commons.wikimedia.org/wiki/File:En-us-sandy.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sandy--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-Sandy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-Sandy.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sandy--commander-keane.mp3` | [File:En-au-Sandy.ogg](https://commons.wikimedia.org/wiki/File:En-au-Sandy.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/sank--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-sank.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-sank.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/sank--dvortygirl.mp3` | [File:En-us-sank.ogg](https://commons.wikimedia.org/wiki/File:En-us-sank.ogg) | Dvortygirl | Public domain |
| `words/sank--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sank.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sank.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/save--dvortygirl.mp3` | [File:En-us-save.ogg](https://commons.wikimedia.org/wiki/File:En-us-save.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/save--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-save.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-save.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/save--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-save.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-save.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/saw--dvortygirl.mp3` | [File:En-us-saw.ogg](https://commons.wikimedia.org/wiki/File:En-us-saw.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/saw--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-saw.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-saw.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/saw--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-saw.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-saw.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sea--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sea.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sea.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sea--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Sea.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Sea.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sea--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-sea.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-sea.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/seal--dvortygirl.mp3` | [File:En-us-seal.ogg](https://commons.wikimedia.org/wiki/File:En-us-seal.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/seal--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-seal.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-seal.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/seat--dvortygirl.mp3` | [File:En-us-seat.ogg](https://commons.wikimedia.org/wiki/File:En-us-seat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/seat--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-seat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-seat.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/seat--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-seat.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-seat.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/seed--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-seed.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-seed.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/seed--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-seed.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-seed.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/seed--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-seed.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-seed.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/seek--dvortygirl.mp3` | [File:En-us-seek.ogg](https://commons.wikimedia.org/wiki/File:En-us-seek.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/seek--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-seek.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-seek.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/seek--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-seek.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-seek.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/seem--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-seem.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-seem.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/seem--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-seem.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-seem.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/seem--dvortygirl.mp3` | [File:En-us-seem.ogg](https://commons.wikimedia.org/wiki/File:En-us-seem.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/seen--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-seen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-seen.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/seen--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-seen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-seen.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/seen--dvortygirl.mp3` | [File:En-us-seen.ogg](https://commons.wikimedia.org/wiki/File:En-us-seen.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/seethe--dvortygirl.mp3` | [File:En-us-seethe.ogg](https://commons.wikimedia.org/wiki/File:En-us-seethe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/seize--dvortygirl.mp3` | [File:En-us-seize.ogg](https://commons.wikimedia.org/wiki/File:En-us-seize.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/self--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-self.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-self.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/self--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-self.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-self.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/self--dvortygirl.mp3` | [File:En-us-self.ogg](https://commons.wikimedia.org/wiki/File:En-us-self.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sell--dvortygirl.mp3` | [File:En-us-sell.ogg](https://commons.wikimedia.org/wiki/File:En-us-sell.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sell--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sell.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sell.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sell--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-sell.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-sell.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/seven--numberone-commonswiki.mp3` | [File:En-us-Seven.ogg](https://commons.wikimedia.org/wiki/File:En-us-Seven.ogg) | NumberOne~commonswiki | Public domain |
| `words/seven--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-seven.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-seven.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/seven--dvortygirl.mp3` | [File:En-us-seven.ogg](https://commons.wikimedia.org/wiki/File:En-us-seven.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shack--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-shack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-shack.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/shack--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-shack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-shack.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/shark--dvortygirl.mp3` | [File:En-us-shark.ogg](https://commons.wikimedia.org/wiki/File:En-us-shark.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shark--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shark.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shark.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shark--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-shark.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-shark.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/shave--dvortygirl.mp3` | [File:En-us-shave.ogg](https://commons.wikimedia.org/wiki/File:En-us-shave.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/she--dvortygirl.mp3` | [File:En-us-she.ogg](https://commons.wikimedia.org/wiki/File:En-us-she.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/she--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-she.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-she.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/she--association-shtooka-judi.mp3` | [File:En-uk-she.ogg](https://commons.wikimedia.org/wiki/File:En-uk-she.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/sheep--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sheep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sheep.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sheep--flame-not-lame.mp3` | [File:LL-Q1860 (eng)-Flame, not lame-Sheep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Flame,_not_lame-Sheep.wav) | Speaker: Flame, not lame Recorder: Flame, not lame | CC0 |
| `words/sheep--dvortygirl.mp3` | [File:En-us-sheep.ogg](https://commons.wikimedia.org/wiki/File:En-us-sheep.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sheet--dvortygirl.mp3` | [File:En-us-sheet.ogg](https://commons.wikimedia.org/wiki/File:En-us-sheet.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sheet--association-shtooka-judi.mp3` | [File:En-uk-sheet.ogg](https://commons.wikimedia.org/wiki/File:En-uk-sheet.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/sheet--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-sheet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-sheet.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/shelf--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-shelf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-shelf.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/shelf--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-shelf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-shelf.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/shelf--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-shelf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-shelf.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/shell--dvortygirl.mp3` | [File:En-us-shell.ogg](https://commons.wikimedia.org/wiki/File:En-us-shell.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shell--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shell.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shell.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shine--dvortygirl.mp3` | [File:En-us-shine.ogg](https://commons.wikimedia.org/wiki/File:En-us-shine.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shine--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shine.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shine.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shine--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-shine.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-shine.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/ship--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-ship.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-ship.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/ship--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-ship.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-ship.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/ship--dvortygirl.mp3` | [File:En-us-ship.ogg](https://commons.wikimedia.org/wiki/File:En-us-ship.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shirt--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-shirt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-shirt.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/shirt--association-shtooka-judi.mp3` | [File:En-uk-shirt.ogg](https://commons.wikimedia.org/wiki/File:En-uk-shirt.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/shirt--dvortygirl.mp3` | [File:En-us-shirt.ogg](https://commons.wikimedia.org/wiki/File:En-us-shirt.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shock--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-shock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-shock.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/shock--dvortygirl.mp3` | [File:En-us-shock.ogg](https://commons.wikimedia.org/wiki/File:En-us-shock.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shock--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shock.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shoe--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-shoe.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-shoe.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/shoe--dvortygirl.mp3` | [File:En-us-shoe.ogg](https://commons.wikimedia.org/wiki/File:En-us-shoe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shoe--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shoe.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shoe.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shop--dvortygirl.mp3` | [File:En-us-shop.ogg](https://commons.wikimedia.org/wiki/File:En-us-shop.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/shop--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shop.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shop--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-shop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-shop.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/short--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-short.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-short.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/short--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-short.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-short.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/short--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-short.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-short.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/should--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-should.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-should.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/should--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-should.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-should.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/should--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-should.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-should.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shower--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Shower.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Shower.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/shower--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-shower.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-shower.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/shower--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-shower.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-shower.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/shuck--sylvanmoon.mp3` | [File:En-us-shuck.ogg](https://commons.wikimedia.org/wiki/File:En-us-shuck.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/sick--dvortygirl.mp3` | [File:En-us-sick.ogg](https://commons.wikimedia.org/wiki/File:En-us-sick.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sick--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sick.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sick--association-shtooka-judi.mp3` | [File:En-uk-sick.ogg](https://commons.wikimedia.org/wiki/File:En-uk-sick.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/sigh--dvortygirl.mp3` | [File:En-us-sigh.ogg](https://commons.wikimedia.org/wiki/File:En-us-sigh.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sigh--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-sigh.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-sigh.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/sign--dvortygirl.mp3` | [File:En-us-sign.ogg](https://commons.wikimedia.org/wiki/File:En-us-sign.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sign--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Sign.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Sign.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sign--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sign.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sign.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sin--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sin.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sin--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-sin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-sin.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/sin--fake-estate.mp3` | [File:LL-Q1860 (eng)-Fake estate-sin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Fake_estate-sin.wav) | Speaker: Fake estate Recorder: Fake estate | CC BY-SA 4.0 |
| `words/sing--dvortygirl.mp3` | [File:En-us-sing.ogg](https://commons.wikimedia.org/wiki/File:En-us-sing.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sing--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sing.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sing--celestianpower.mp3` | [File:En-uk-sing.ogg](https://commons.wikimedia.org/wiki/File:En-uk-sing.ogg) | Celestianpower | Public domain |
| `words/sink--dvortygirl.mp3` | [File:En-us-sink.ogg](https://commons.wikimedia.org/wiki/File:En-us-sink.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sink--celestianpower.mp3` | [File:En-uk-sink.ogg](https://commons.wikimedia.org/wiki/File:En-uk-sink.ogg) | Celestianpower | Public domain |
| `words/sink--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Sink.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Sink.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/sip--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-sip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-sip.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/sit--dvortygirl.mp3` | [File:En-us-sit.ogg](https://commons.wikimedia.org/wiki/File:En-us-sit.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sit--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sit.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sit--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sit.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/six--numberone-commonswiki.mp3` | [File:En-us-Six.ogg](https://commons.wikimedia.org/wiki/File:En-us-Six.ogg) | NumberOne~commonswiki | Public domain |
| `words/six--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-six.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-six.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/six--thedaveross.mp3` | [File:En-us-six.ogg](https://commons.wikimedia.org/wiki/File:En-us-six.ogg) | TheDaveRoss | CC BY-SA 3.0 |
| `words/ski--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-ski.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-ski.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/sleep--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sleep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sleep.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sleep--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sleep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sleep.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sleep--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-sleep.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-sleep.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/sleet--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-sleet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-sleet.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/slip--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-slip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-slip.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/slip--dvortygirl.mp3` | [File:En-us-slip.ogg](https://commons.wikimedia.org/wiki/File:En-us-slip.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/slip--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-slip.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-slip.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/snail--dvortygirl.mp3` | [File:En-us-snail.ogg](https://commons.wikimedia.org/wiki/File:En-us-snail.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/snake--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-snake.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-snake.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/snake--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-snake.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-snake.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/snake--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-snake.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-snake.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/snow--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-snow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-snow.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/snow--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-snow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-snow.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/snow--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-snow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-snow.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/sock--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sock.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sock--dvortygirl.mp3` | [File:En-us-sock.ogg](https://commons.wikimedia.org/wiki/File:En-us-sock.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sock--nattes-chat.mp3` | [File:LL-Q1860 (eng)-Nattes à chat-sock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Nattes_%C3%A0_chat-sock.wav) | Speaker: Nattes à chat Recorder: Nattes à chat | CC BY-SA 4.0 |
| `words/sofa--dvortygirl.mp3` | [File:En-us-sofa.ogg](https://commons.wikimedia.org/wiki/File:En-us-sofa.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sofa--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Sofa.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Sofa.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/soot--dvortygirl.mp3` | [File:En-us-soot.ogg](https://commons.wikimedia.org/wiki/File:En-us-soot.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sort--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sort.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sort.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sort--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sort.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sort.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sort--dvortygirl.mp3` | [File:En-us-sort.ogg](https://commons.wikimedia.org/wiki/File:En-us-sort.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/soup--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-soup.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-soup.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/soup--association-shtooka-judi.mp3` | [File:En-uk-soup.ogg](https://commons.wikimedia.org/wiki/File:En-uk-soup.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/soup--dvortygirl.mp3` | [File:En-us-soup.ogg](https://commons.wikimedia.org/wiki/File:En-us-soup.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sour--dvortygirl.mp3` | [File:En-us-sour.ogg](https://commons.wikimedia.org/wiki/File:En-us-sour.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/spider--dvortygirl.mp3` | [File:En-us-spider.ogg](https://commons.wikimedia.org/wiki/File:En-us-spider.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/spider--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-spider.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-spider.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/spider--commander-keane.mp3` | [File:En-au-spider.ogg](https://commons.wikimedia.org/wiki/File:En-au-spider.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/spin--dvortygirl.mp3` | [File:En-us-spin.ogg](https://commons.wikimedia.org/wiki/File:En-us-spin.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/spin--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-spin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-spin.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/spin--commander-keane.mp3` | [File:En-au-spin.ogg](https://commons.wikimedia.org/wiki/File:En-au-spin.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/spoon--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-spoon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-spoon.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/spoon--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Spoon.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Spoon.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/spoon--dvortygirl.mp3` | [File:En-us-spoon.ogg](https://commons.wikimedia.org/wiki/File:En-us-spoon.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sport--dvortygirl.mp3` | [File:En-us-sport.ogg](https://commons.wikimedia.org/wiki/File:En-us-sport.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sport--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sport.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sport.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sport--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-sport.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-sport.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/squid--dvortygirl.mp3` | [File:En-us-squid.ogg](https://commons.wikimedia.org/wiki/File:En-us-squid.ogg) | Dvortygirl | Public domain |
| `words/squid--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-squid.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-squid.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/squid--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-squid.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-squid.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/stack--i-learned-some-phrases.mp3` | [File:LL-Q1860 (eng)-I learned some phrases-stack.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-I_learned_some_phrases-stack.wav) | Speaker: I learned some phrases Recorder: I learned some phrases | CC BY-SA 4.0 |
| `words/stack--commander-keane.mp3` | [File:En-au-stack.ogg](https://commons.wikimedia.org/wiki/File:En-au-stack.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/star--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-star.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-star.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/star--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-star.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-star.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/star--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-star.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-star.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/stewed--persent101.mp3` | [File:LL-Q1860 (eng)-Persent101-stewed.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Persent101-stewed.wav) | Speaker: Persent101 Recorder: Persent101 | CC BY-SA 4.0 |
| `words/stir--dvortygirl.mp3` | [File:En-us-stir.ogg](https://commons.wikimedia.org/wiki/File:En-us-stir.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/stock--dvortygirl.mp3` | [File:En-us-stock.ogg](https://commons.wikimedia.org/wiki/File:En-us-stock.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/stock--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Stock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Stock.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/stock--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-stock.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-stock.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/stood--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-stood.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-stood.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/stood--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-stood.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-stood.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/stood--dvortygirl.mp3` | [File:En-us-stood.ogg](https://commons.wikimedia.org/wiki/File:En-us-stood.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/stop--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-stop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-stop.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/stop--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-stop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-stop.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/stop--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-stop.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-stop.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/stuck--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-stuck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-stuck.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/stuck--dvortygirl.mp3` | [File:En-us-stuck.ogg](https://commons.wikimedia.org/wiki/File:En-us-stuck.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/stuck--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-stuck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-stuck.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/stun--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-stun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-stun.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/stung--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-stung.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-stung.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/stung--neskaya.mp3` | [File:En-us-stung.ogg](https://commons.wikimedia.org/wiki/File:En-us-stung.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/stung--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-stung.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-stung.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/suck--dvortygirl.mp3` | [File:En-us-suck.ogg](https://commons.wikimedia.org/wiki/File:En-us-suck.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/suck--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-suck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-suck.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/suck--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-suck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-suck.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/sue--neskaya.mp3` | [File:En-us-sue.ogg](https://commons.wikimedia.org/wiki/File:En-us-sue.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/sue--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sue.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/sue--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-sue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-sue.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/suit--dvortygirl.mp3` | [File:En-us-suit.ogg](https://commons.wikimedia.org/wiki/File:En-us-suit.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/suit--taxrebate.mp3` | [File:En-uk-suit.ogg](https://commons.wikimedia.org/wiki/File:En-uk-suit.ogg) | TaxRebate | CC BY-SA 4.0 |
| `words/suit--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-suit.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-suit.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/suite--neskaya.mp3` | [File:En-us-suite.ogg](https://commons.wikimedia.org/wiki/File:En-us-suite.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/suite--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Suite.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Suite.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sum--dvortygirl.mp3` | [File:En-us-sum.ogg](https://commons.wikimedia.org/wiki/File:En-us-sum.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/sun--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-sun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-sun.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/sun--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-sun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-sun.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/sun--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-sun.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-sun.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/sung--turtlemedicine.mp3` | [File:LL-Q1860 (eng)-TurtleMedicine-sung.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-TurtleMedicine-sung.wav) | Speaker: TurtleMedicine Recorder: TurtleMedicine | CC0 |
| `words/sung--mx-granger.mp3` | [File:En-us-sung.ogg](https://commons.wikimedia.org/wiki/File:En-us-sung.ogg) | Mx. Granger | CC0 |
| `words/sung--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-sung.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-sung.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/support--dvortygirl.mp3` | [File:En-us-support.ogg](https://commons.wikimedia.org/wiki/File:En-us-support.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/support--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-support.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-support.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/support--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-support.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-support.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/swim--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-swim.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-swim.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/swim--dvortygirl.mp3` | [File:En-us-swim.ogg](https://commons.wikimedia.org/wiki/File:En-us-swim.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/swim--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-swim.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-swim.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/swing--dvortygirl.mp3` | [File:En-us-swing.ogg](https://commons.wikimedia.org/wiki/File:En-us-swing.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/swing--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-swing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-swing.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/swing--lepticed7.mp3` | [File:LL-Q1860 (eng)-Lepticed7-swing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Lepticed7-swing.wav) | Speaker: Lepticed7 Recorder: Lepticed7 | CC BY-SA 4.0 |
| `words/tack--dvortygirl.mp3` | [File:En-us-tack.ogg](https://commons.wikimedia.org/wiki/File:En-us-tack.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/tease--dvortygirl.mp3` | [File:En-us-tease.ogg](https://commons.wikimedia.org/wiki/File:En-us-tease.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/teen--dvortygirl.mp3` | [File:En-us-teen.ogg](https://commons.wikimedia.org/wiki/File:En-us-teen.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/teen--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Teen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Teen.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/teen--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-teen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-teen.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/teeth--dvortygirl.mp3` | [File:En-us-teeth.ogg](https://commons.wikimedia.org/wiki/File:En-us-teeth.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/teeth--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-teeth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-teeth.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/teeth--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-teeth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-teeth.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/teethe--dvortygirl.mp3` | [File:En-us-teethe.ogg](https://commons.wikimedia.org/wiki/File:En-us-teethe.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/television--dvortygirl.mp3` | [File:En-us-television.ogg](https://commons.wikimedia.org/wiki/File:En-us-television.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/television--association-shtooka-judi.mp3` | [File:En-uk-television.ogg](https://commons.wikimedia.org/wiki/File:En-uk-television.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/television--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Television.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Television.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/ten--thedaveross.mp3` | [File:En-us-ten.ogg](https://commons.wikimedia.org/wiki/File:En-us-ten.ogg) | TheDaveRoss | CC BY-SA 3.0 |
| `words/ten--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-ten.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-ten.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/ten--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-ten.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-ten.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/tense--dvortygirl.mp3` | [File:En-us-tense.ogg](https://commons.wikimedia.org/wiki/File:En-us-tense.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/tense--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-tense.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-tense.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/tense--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-tense.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-tense.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/tent--dvortygirl.mp3` | [File:En-us-tent.ogg](https://commons.wikimedia.org/wiki/File:En-us-tent.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/tent--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-tent.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-tent.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/tenth--dvortygirl.mp3` | [File:En-us-tenth.ogg](https://commons.wikimedia.org/wiki/File:En-us-tenth.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/tenth--simplificationalizer.mp3` | [File:LL-Q1860 (eng)-Simplificationalizer-tenth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Simplificationalizer-tenth.wav) | Speaker: Simplificationalizer Recorder: Simplificationalizer | CC0 |
| `words/thank--dvortygirl.mp3` | [File:En-us-thank.ogg](https://commons.wikimedia.org/wiki/File:En-us-thank.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/thank--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-thank.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-thank.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/thank--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-thank.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-thank.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/thaw--dvortygirl.mp3` | [File:En-us-thaw.ogg](https://commons.wikimedia.org/wiki/File:En-us-thaw.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/theme--dvortygirl.mp3` | [File:En-us-theme.ogg](https://commons.wikimedia.org/wiki/File:En-us-theme.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/theme--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-theme.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-theme.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/theme--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-theme.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-theme.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/then--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-then.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-then.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/then--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-then.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-then.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/then--dvortygirl.mp3` | [File:En-us-then.ogg](https://commons.wikimedia.org/wiki/File:En-us-then.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/there--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-there.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-there.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/there--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-There.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-There.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/there--dvortygirl.mp3` | [File:En-us-there.ogg](https://commons.wikimedia.org/wiki/File:En-us-there.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/they--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-they.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-they.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/they--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-They.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-They.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/they--dvortygirl.mp3` | [File:En-us-they.ogg](https://commons.wikimedia.org/wiki/File:En-us-they.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/thick--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-thick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-thick.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/thick--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-thick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-thick.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/thick--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-thick.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-thick.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/thigh--dvortygirl.mp3` | [File:En-us-thigh.ogg](https://commons.wikimedia.org/wiki/File:En-us-thigh.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/thigh--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-thigh.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-thigh.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/thigh--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-thigh.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-thigh.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/thin--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-thin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-thin.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/thin--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-thin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-thin.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/thin--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-thin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-thin.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/thing--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-thing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-thing.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/thing--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-thing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-thing.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/thing--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-thing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-thing.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/think--dvortygirl.mp3` | [File:En-us-think.ogg](https://commons.wikimedia.org/wiki/File:En-us-think.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/think--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-think.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-think.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/think--x.mp3` | [File:En-us-think.wav](https://commons.wikimedia.org/wiki/File:En-us-think.wav) | Ντόναλντ | CC BY-SA 4.0 |
| `words/this--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-this.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-this.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/this--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-This.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-This.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/this--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-this.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-this.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/those--dvortygirl.mp3` | [File:En-us-those.ogg](https://commons.wikimedia.org/wiki/File:En-us-those.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/those--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-those.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-those.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/those--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-those.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-those.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/though--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-though.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-though.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/though--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-though.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-though.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/though--dvortygirl.mp3` | [File:En-us-though.ogg](https://commons.wikimedia.org/wiki/File:En-us-though.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/three--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-three.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-three.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/three--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-three.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-three.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/three--numberone-commonswiki.mp3` | [File:En-us-Three.ogg](https://commons.wikimedia.org/wiki/File:En-us-Three.ogg) | NumberOne~commonswiki | Public domain |
| `words/thumb--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-thumb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-thumb.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/thumb--dvortygirl.mp3` | [File:En-us-thumb.ogg](https://commons.wikimedia.org/wiki/File:En-us-thumb.ogg) | Dvortygirl | Public domain |
| `words/thumb--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-thumb.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-thumb.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/tiger--dvortygirl.mp3` | [File:En-us-tiger.ogg](https://commons.wikimedia.org/wiki/File:En-us-tiger.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/tiger--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-tiger.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-tiger.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/tin--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-tin.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-tin.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/tin--dvortygirl.mp3` | [File:En-us-tin.ogg](https://commons.wikimedia.org/wiki/File:En-us-tin.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/toast--neskaya.mp3` | [File:En-us-toast.ogg](https://commons.wikimedia.org/wiki/File:En-us-toast.ogg) | Neskaya | CC BY-SA 3.0 |
| `words/toast--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-toast.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-toast.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/toast--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-toast.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-toast.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/ton--caulkyalphabet.mp3` | [File:LL-Q1860 (eng)-CaulkyAlphabet-ton.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-CaulkyAlphabet-ton.wav) | Speaker: CaulkyAlphabet Recorder: CaulkyAlphabet | CC0 |
| `words/ton--dvortygirl.mp3` | [File:En-us-ton.ogg](https://commons.wikimedia.org/wiki/File:En-us-ton.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/ton--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-ton.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-ton.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/tongue--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-tongue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-tongue.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/tongue--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-tongue.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-tongue.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/tongue--dvortygirl.mp3` | [File:En-us-tongue.ogg](https://commons.wikimedia.org/wiki/File:En-us-tongue.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/tooth--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-tooth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-tooth.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/tooth--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-tooth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-tooth.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/tooth--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-tooth.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-tooth.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/toy--dvortygirl.mp3` | [File:En-us-toy.ogg](https://commons.wikimedia.org/wiki/File:En-us-toy.ogg) | Dvortygirl | Public domain |
| `words/toy--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-toy.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-toy.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/train--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-train.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-train.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/train--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-train.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-train.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/train--dvortygirl.mp3` | [File:En-us-train.ogg](https://commons.wikimedia.org/wiki/File:En-us-train.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/treasure--dvortygirl.mp3` | [File:En-us-treasure.ogg](https://commons.wikimedia.org/wiki/File:En-us-treasure.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/treasure--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-treasure.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-treasure.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/treasure--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-treasure.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-treasure.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/tree--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-tree.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-tree.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/tree--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-tree.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-tree.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/tree--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-tree.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-tree.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/truck--dvortygirl.mp3` | [File:En-us-truck.ogg](https://commons.wikimedia.org/wiki/File:En-us-truck.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/truck--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Truck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Truck.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/truck--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-truck.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-truck.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/tuck--dvortygirl.mp3` | [File:En-us-tuck.ogg](https://commons.wikimedia.org/wiki/File:En-us-tuck.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/turtle--dvortygirl.mp3` | [File:En-us-turtle.ogg](https://commons.wikimedia.org/wiki/File:En-us-turtle.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/turtle--commander-keane.mp3` | [File:En-au-turtle.ogg](https://commons.wikimedia.org/wiki/File:En-au-turtle.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/two--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-two.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-two.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/two--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-two.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-two.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/two--numberone-commonswiki.mp3` | [File:En-us-Two.ogg](https://commons.wikimedia.org/wiki/File:En-us-Two.ogg) | NumberOne~commonswiki | Public domain |
| `words/udder--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-udder.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-udder.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/udder--commander-keane.mp3` | [File:En-au-udder.ogg](https://commons.wikimedia.org/wiki/File:En-au-udder.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/uncle--dvortygirl.mp3` | [File:En-us-uncle.ogg](https://commons.wikimedia.org/wiki/File:En-us-uncle.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/uncle--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-uncle.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-uncle.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/uncle--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-uncle.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-uncle.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/van--dvortygirl.mp3` | [File:En-us-van.ogg](https://commons.wikimedia.org/wiki/File:En-us-van.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/van--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-Van.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-Van.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/van--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-van.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-van.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/vase--dvortygirl.mp3` | [File:En-us-vase.ogg](https://commons.wikimedia.org/wiki/File:En-us-vase.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/vase--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Vase.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Vase.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/vase--knowledgeisking1.mp3` | [File:En-gb-vase.ogg](https://commons.wikimedia.org/wiki/File:En-gb-vase.ogg) | Knowledgeisking1 | CC BY-SA 4.0 |
| `words/vat--dvortygirl.mp3` | [File:En-us-vat.ogg](https://commons.wikimedia.org/wiki/File:En-us-vat.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/vat--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-VAT.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-VAT.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/veil--dvortygirl.mp3` | [File:En-us-veil.ogg](https://commons.wikimedia.org/wiki/File:En-us-veil.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/vend--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-vend.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-vend.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/vend--commander-keane.mp3` | [File:En-au-vend.ogg](https://commons.wikimedia.org/wiki/File:En-au-vend.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/vent--sylvanmoon.mp3` | [File:En-us-vent.ogg](https://commons.wikimedia.org/wiki/File:En-us-vent.ogg) | Sylvanmoon | CC BY-SA 4.0 |
| `words/very--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-very.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-very.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/very--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-very.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-very.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/very--dvortygirl.mp3` | [File:En-us-very.ogg](https://commons.wikimedia.org/wiki/File:En-us-very.ogg) | Dvortygirl | Public domain |
| `words/vest--dvortygirl.mp3` | [File:En-us-vest.ogg](https://commons.wikimedia.org/wiki/File:En-us-vest.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/vet--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-vet.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-vet.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/vision--dvortygirl.mp3` | [File:En-us-vision.ogg](https://commons.wikimedia.org/wiki/File:En-us-vision.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/vision--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-vision.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-vision.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/vision--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-vision.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-vision.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/volt--vealhurl.mp3` | [File:LL-Q1860 (eng)-Vealhurl-volt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Vealhurl-volt.wav) | Speaker: Vealhurl Recorder: Vealhurl | CC BY-SA 4.0 |
| `words/volt--n0tc0unting.mp3` | [File:LL-Q1860 (eng)-N0tc0unting-Volt.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-N0tc0unting-Volt.wav) | Speaker: N0tc0unting Recorder: N0tc0unting | CC0 |
| `words/vote--dvortygirl.mp3` | [File:En-us-vote.ogg](https://commons.wikimedia.org/wiki/File:En-us-vote.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/vote--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-vote.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-vote.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/vote--wodencafe.mp3` | [File:LL-Q1860 (eng)-Wodencafe-vote.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Wodencafe-vote.wav) | Speaker: Wodencafe Recorder: Wodencafe | CC0 |
| `words/walk--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-walk.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-walk.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/walk--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-walk.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-walk.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/walk--dvortygirl.mp3` | [File:En-us-walk.ogg](https://commons.wikimedia.org/wiki/File:En-us-walk.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/wash--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-wash.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-wash.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/wash--dvortygirl.mp3` | [File:En-us-wash.ogg](https://commons.wikimedia.org/wiki/File:En-us-wash.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/wash--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-wash.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-wash.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/watch--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-watch.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-watch.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/watch--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-watch.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-watch.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/watch--dvortygirl.mp3` | [File:En-us-watch.ogg](https://commons.wikimedia.org/wiki/File:En-us-watch.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/water--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-water.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-water.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/water--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Water.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Water.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/water--dvortygirl.mp3` | [File:En-us-water.ogg](https://commons.wikimedia.org/wiki/File:En-us-water.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/web--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-web.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-web.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY 4.0 |
| `words/web--dvortygirl.mp3` | [File:En-us-web.ogg](https://commons.wikimedia.org/wiki/File:En-us-web.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/web--samuel-muldoon-muldoonsa.mp3` | [File:LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-web.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-web.wav) | Speaker: Samuel Muldoon Recorder: Muldoonsamuel55 | CC0 |
| `words/whale--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-whale.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-whale.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/whale--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-whale.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-whale.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/whale--dvortygirl.mp3` | [File:En-us-whale.ogg](https://commons.wikimedia.org/wiki/File:En-us-whale.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/wheel--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-wheel.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-wheel.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/wheel--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-wheel.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-wheel.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/wheel--dvortygirl.mp3` | [File:En-us-wheel.ogg](https://commons.wikimedia.org/wiki/File:En-us-wheel.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/white--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-white.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-white.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/white--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-white.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-white.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/white--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-white.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-white.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/win--dvortygirl.mp3` | [File:En-us-win.ogg](https://commons.wikimedia.org/wiki/File:En-us-win.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/win--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-win.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-win.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/win--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-win.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-win.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/window--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-window.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-window.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/window--association-shtooka-judi.mp3` | [File:En-uk-window.ogg](https://commons.wikimedia.org/wiki/File:En-uk-window.ogg) | Association Shtooka, Judith Franck | CC BY 3.0 us |
| `words/window--status-401.mp3` | [File:LL-Q1860 (eng)-Status 401-Window.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Status_401-Window.wav) | Speaker: Status 401 Recorder: Status 401 | CC0 |
| `words/wing--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-wing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-wing.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/wing--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-wing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-wing.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/wing--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-wing.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-wing.wav) | Speaker: Rachlel Recorder: Rachlel | CC0 |
| `words/wolf--dvortygirl.mp3` | [File:En-us-wolf.ogg](https://commons.wikimedia.org/wiki/File:En-us-wolf.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/wolf--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-wolf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-wolf.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/wolf--gonfreeaks.mp3` | [File:LL-Q1860 (eng)-GonFreeaks-wolf.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-GonFreeaks-wolf.wav) | Speaker: GonFreeaks Recorder: GonFreeaks | CC BY-SA 4.0 |
| `words/wood--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-wood.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-wood.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/wood--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-wood.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-wood.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/wood--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-wood.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-wood.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/word--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-word.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-word.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/word--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-word.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-word.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/word--ov3for.mp3` | [File:LL-Q1860 (eng)-Ov3for-Word.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Ov3for-Word.wav) | Speaker: Ov3for Recorder: Ov3for | CC0 |
| `words/worm--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-worm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-worm.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/worm--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-worm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-worm.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/worm--rachlel.mp3` | [File:LL-Q1860 (eng)-Rachlel-worm.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Rachlel-worm.wav) | Speaker: Rachlel Recorder: Rachlel | CC BY-SA 4.0 |
| `words/wrong--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-wrong.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-wrong.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/wrong--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-wrong.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-wrong.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/wrong--grendelkhan.mp3` | [File:LL-Q1860 (eng)-Grendelkhan-wrong.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-wrong.wav) | Speaker: Grendelkhan Recorder: Grendelkhan | CC0 |
| `words/yak--commander-keane.mp3` | [File:En-au-yak.ogg](https://commons.wikimedia.org/wiki/File:En-au-yak.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/yarn--encyclopetey.mp3` | [File:En-us-yarn.ogg](https://commons.wikimedia.org/wiki/File:En-us-yarn.ogg) | EncycloPetey | CC BY-SA 3.0 |
| `words/yarn--commander-keane.mp3` | [File:En-au-yarn.ogg](https://commons.wikimedia.org/wiki/File:En-au-yarn.ogg) | Commander Keane | CC BY-SA 4.0 |
| `words/yawn--dvortygirl.mp3` | [File:En-us-yawn.ogg](https://commons.wikimedia.org/wiki/File:En-us-yawn.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/yellow--naomi-persephone-amethys.mp3` | [File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-yellow.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Naomi_Persephone_Amethyst_(NaomiAmethyst)-yellow.wav) | Speaker: Naomi Persephone Amethyst Recorder: NaomiAmethyst | CC BY-SA 4.0 |
| `words/yellow--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-YELLOW.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-YELLOW.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/yellow--dvortygirl.mp3` | [File:En-us-yellow.ogg](https://commons.wikimedia.org/wiki/File:En-us-yellow.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/zebra--dvortygirl.mp3` | [File:En-us-zebra.ogg](https://commons.wikimedia.org/wiki/File:En-us-zebra.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/zebra--back-ache.mp3` | [File:LL-Q1860 (eng)-Back ache-Zebra.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Back_ache-Zebra.wav) | Speaker: Back ache Recorder: Back ache | CC BY-SA 4.0 |
| `words/zebra--celestianpower.mp3` | [File:En-uk-zebra.ogg](https://commons.wikimedia.org/wiki/File:En-uk-zebra.ogg) | Celestianpower | Public domain |
| `words/zen--dvortygirl.mp3` | [File:En-us-zen.ogg](https://commons.wikimedia.org/wiki/File:En-us-zen.ogg) | Dvortygirl | CC BY-SA 3.0 |
| `words/zen--arlo-barnes.mp3` | [File:LL-Q1860 (eng)-Arlo Barnes-zen.wav](https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Arlo_Barnes-zen.wav) | Speaker: Arlo Barnes Recorder: Arlo Barnes | CC0 |
| `words/zoo--neoglitch.mp3` | [File:En-us-zoo.ogg](https://commons.wikimedia.org/wiki/File:En-us-zoo.ogg) | Neoglitch | CC BY-SA 3.0 |
| `phonemes/ph-ai--enveloup.mp3` | [File:Aj dif.ogg](https://commons.wikimedia.org/wiki/File:Aj_dif.ogg) | Enveloup | CC BY-SA 4.0 |
| `phonemes/ph-au--enveloup.mp3` | [File:Aw dif.ogg](https://commons.wikimedia.org/wiki/File:Aw_dif.ogg) | Enveloup | CC BY-SA 4.0 |
| `phonemes/ph-b--peter-isotalo.mp3` | [File:Voiced bilabial plosive.ogg](https://commons.wikimedia.org/wiki/File:Voiced_bilabial_plosive.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-d--peter-isotalo.mp3` | [File:Voiced alveolar plosive.ogg](https://commons.wikimedia.org/wiki/File:Voiced_alveolar_plosive.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-dzh--the-original-uploader-wa.mp3` | [File:Voiced palato-alveolar affricate.ogg](https://commons.wikimedia.org/wiki/File:Voiced_palato-alveolar_affricate.ogg) | The original uploader was Octane at English Wikipedia . | Public domain |
| `phonemes/ph-ei--enveloup.mp3` | [File:Ej dif.ogg](https://commons.wikimedia.org/wiki/File:Ej_dif.ogg) | Enveloup | CC BY-SA 4.0 |
| `phonemes/ph-f--peter-isotalo.mp3` | [File:Voiceless labiodental fricative.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_labiodental_fricative.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-g--peter-isotalo.mp3` | [File:Voiced velar plosive 02.ogg](https://commons.wikimedia.org/wiki/File:Voiced_velar_plosive_02.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-g--peter-isotalo-2.mp3` | [File:Voiced velar plosive.ogg](https://commons.wikimedia.org/wiki/File:Voiced_velar_plosive.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-h--peter-isotalo.mp3` | [File:Voiceless glottal fricative.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_glottal_fricative.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-ii--denelson83.mp3` | [File:Close front unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Close_front_unrounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-k--peter-isotalo.mp3` | [File:Voiceless velar plosive.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_velar_plosive.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-l--peter-isotalo.mp3` | [File:Alveolar lateral approximant.ogg](https://commons.wikimedia.org/wiki/File:Alveolar_lateral_approximant.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-m--peter-isotalo.mp3` | [File:Bilabial nasal.ogg](https://commons.wikimedia.org/wiki/File:Bilabial_nasal.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-n--peter-isotalo.mp3` | [File:Alveolar nasal.ogg](https://commons.wikimedia.org/wiki/File:Alveolar_nasal.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-p--peter-isotalo.mp3` | [File:Voiceless bilabial plosive.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_bilabial_plosive.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-r--erutuon.mp3` | [File:Alveolar approximant.ogg](https://commons.wikimedia.org/wiki/File:Alveolar_approximant.ogg) | Erutuon | CC BY-SA 3.0 |
| `phonemes/ph-s--peter-isotalo.mp3` | [File:Voiceless alveolar sibilant.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_sibilant.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-t--peter-isotalo.mp3` | [File:Voiceless alveolar plosive.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_plosive.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-ch--peter-isotalo.mp3` | [File:Voiceless palato-alveolar affricate.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_palato-alveolar_affricate.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-oo--denelson83.mp3` | [File:Close back rounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Close_back_rounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-v--peter-isotalo.mp3` | [File:Voiced labiodental fricative.ogg](https://commons.wikimedia.org/wiki/File:Voiced_labiodental_fricative.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-w--peter-isotalo.mp3` | [File:Voiced labio-velar approximant.ogg](https://commons.wikimedia.org/wiki/File:Voiced_labio-velar_approximant.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-z--peter-isotalo.mp3` | [File:Voiced alveolar sibilant.ogg](https://commons.wikimedia.org/wiki/File:Voiced_alveolar_sibilant.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-ae--denelson83.mp3` | [File:Near-open front unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Near-open_front_unrounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-ae--brendan-heberlein.mp3` | [File:Near-open frontal unrounded vowel (æ).ogg](https://commons.wikimedia.org/wiki/File:Near-open_frontal_unrounded_vowel_(%C3%A6).ogg) | Brendan Heberlein | CC BY-SA 4.0 |
| `phonemes/ph-dh--peter-isotalo.mp3` | [File:Voiced dental fricative.ogg](https://commons.wikimedia.org/wiki/File:Voiced_dental_fricative.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-ng--peter-isotalo.mp3` | [File:Velar nasal.ogg](https://commons.wikimedia.org/wiki/File:Velar_nasal.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-aa--denelson83.mp3` | [File:Open back unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Open_back_unrounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-aw--denelson83.mp3` | [File:Open-mid back rounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Open-mid_back_rounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-oi--enveloup.mp3` | [File:Ɔj dif.ogg](https://commons.wikimedia.org/wiki/File:%C6%86j_dif.ogg) | Enveloup | CC BY-SA 4.0 |
| `phonemes/ph-schwa--denelson83.mp3` | [File:Mid-central vowel.ogg](https://commons.wikimedia.org/wiki/File:Mid-central_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-schwa--denelson83-2.mp3` | [File:Schwa.ogg](https://commons.wikimedia.org/wiki/File:Schwa.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-eh--denelson83.mp3` | [File:Open-mid front unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Open-mid_front_unrounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-er--roachpeter.mp3` | [File:PR-r-coloured open-mid central unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:PR-r-coloured_open-mid_central_unrounded_vowel.ogg) | RoachPeter | CC BY-SA 4.0 |
| `phonemes/ph-ih--denelson83.mp3` | [File:Near-close near-front unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Near-close_near-front_unrounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-sh--peter-isotalo.mp3` | [File:Voiceless palato-alveolar sibilant.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_palato-alveolar_sibilant.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-uu--denelson83.mp3` | [File:Near-close near-back rounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Near-close_near-back_rounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-uh--denelson83.mp3` | [File:Open-mid back unrounded vowel.ogg](https://commons.wikimedia.org/wiki/File:Open-mid_back_unrounded_vowel.ogg) | Denelson83 | CC BY-SA 3.0 |
| `phonemes/ph-zh--peter-isotalo.mp3` | [File:Voiced palato-alveolar sibilant.ogg](https://commons.wikimedia.org/wiki/File:Voiced_palato-alveolar_sibilant.ogg) | Peter Isotalo | CC BY-SA 3.0 |
| `phonemes/ph-th--peter-isotalo.mp3` | [File:Voiceless dental fricative.ogg](https://commons.wikimedia.org/wiki/File:Voiceless_dental_fricative.ogg) | Peter Isotalo | CC BY-SA 3.0 |
<!-- CREDITS:end -->
