// きめつクエスト: キャラ・てき・どうぐ・おんがく の データ（おはなしの ないようは ep1.js）
'use strict';

// ひとの みため（engine.js の drawPerson で ドット絵に する）
const LOOK = {
  tanjiro: { hair: '#2a1512', tip: '#9a2a1a', skin: '#f3cfa8', top: '#1e8a5a', top2: '#151515', pat: 'check', legs: '#3a3a48', ear: true, scar: true },
  nezuko: { hair: '#1b1212', tip: '#e07a3a', skin: '#f6d6b8', top: '#ee92b0', top2: '#f9c8d8', pat: 'asa', legs: '#7a4a3a', long: true, ribbon: '#f05a8a' },
  nezukoOni: { hair: '#1b1212', tip: '#e07a3a', skin: '#f6d6b8', top: '#ee92b0', top2: '#f9c8d8', pat: 'asa', legs: '#7a4a3a', long: true, ribbon: '#f05a8a', eye: '#ff3a9a' },
  giyu: { hair: '#141420', skin: '#f0cca8', top: '#7a2030', top2: '#2f8a5a', top3: '#e0b030', pat: 'half', legs: '#1a1a2a', pony: true, sword: true },
  kie: { hair: '#1e1a1a', skin: '#f2cfaa', top: '#7a5a44', top2: '#5e4434', pat: 'plain', legs: '#5a4030', bun: true },
  takeo: { hair: '#2a1a14', skin: '#f3cfa8', top: '#4a6a9a', pat: 'plain', legs: '#3a3a48', kid: true },
  hanako: { hair: '#2a1a14', skin: '#f6d6b8', top: '#e8a040', pat: 'plain', legs: '#7a4a3a', kid: true, ribbon: '#d84a4a' },
  shigeru: { hair: '#2a1a14', skin: '#f3cfa8', top: '#7aa050', pat: 'plain', legs: '#3a3a48', kid: true },
  saburo: { hair: '#cfcfcf', skin: '#e8c29c', top: '#6a5a4a', pat: 'plain', legs: '#4a3a2a', bald: true, beard: true },
  obaa: { hair: '#bdbdbd', skin: '#eac7a2', top: '#7a6a8a', pat: 'plain', legs: '#4a3a4a', bun: true },
  ojii: { hair: '#d8d8d8', skin: '#e8c29c', top: '#5a6a5a', pat: 'plain', legs: '#3a3a3a', bald: true, beard: true },
  okami: { hair: '#2a2020', skin: '#f2cfaa', top: '#b05a3a', top2: '#c8784a', pat: 'plain', legs: '#5a3a2a', bun: true },
  shop: { hair: '#2a2020', skin: '#eac7a2', top: '#3a5a8a', top2: '#2a4a7a', pat: 'plain', legs: '#2a2a3a' },
  chaya: { hair: '#1e1a1a', skin: '#f6d6b8', top: '#d85a6a', top2: '#f0a0a8', pat: 'asa', legs: '#5a3a3a', bun: true },
  boy: { hair: '#2a2020', skin: '#f3cfa8', top: '#a07a3a', pat: 'plain', legs: '#3a3a48', kid: true },
  man: { hair: '#2a2020', skin: '#e8c29c', top: '#5a5a6a', pat: 'plain', legs: '#2a2a3a' },
  girl: { hair: '#2a1a14', skin: '#f6d6b8', top: '#7a9ad0', top2: '#b0c8f0', pat: 'asa', legs: '#3a4a6a', long: true },
};

// どうぐ・そうび
const ITEMS = {
  onigiri: { name: 'おにぎり', desc: 'HPを 20 かいふくする', heal: 20, price: 4 },
  ame: { name: 'みずあめ', desc: 'きあいを 4 かいふくする', mp: 4, price: 6 },
  sumi: { name: 'すみ', desc: 'うりものの すみ。まちの ひとに うろう', key: true },
};
const GEAR = {
  waraji: { name: 'あたらしい わらじ', def: 1, price: 8 },
  hanten: { name: 'あったか はんてん', def: 3, price: 20 },
};

// てき（たおすと にげていく。ち は でない）
const ENEMIES = {
  tanuki: { name: 'いたずらだぬき', hp: 9, atk: 5, def: 1, agi: 3, exp: 2, gold: 3, art: 'tanuki' },
  karasu: { name: 'やまがらす', hp: 7, atk: 6, def: 1, agi: 9, exp: 3, gold: 2, art: 'karasu' },
  kitsune: { name: 'ゆきぎつね', hp: 12, atk: 6, def: 2, agi: 7, exp: 4, gold: 4, art: 'kitsune' },
  inoshishi: { name: 'あばれいのしし', hp: 15, atk: 7, def: 3, agi: 2, exp: 6, gold: 6, art: 'inoshishi', charge: true },
  nezuko: { name: 'ねずこ', hp: 999, atk: 6, def: 9, agi: 5, person: 'nezukoOni', boss: true, song: 'boss', night: true },
  giyu: { name: 'とみおか ぎゆう', hp: 999, atk: 9, def: 99, agi: 99, person: 'giyu', boss: true, song: 'boss', night: true },
};

// てきの ドットえ（16x16。もじ → いろ）
const ART = {
  tanuki: {
    pal: { a: '#9a6a3a', b: '#5a3a20', w: '#f2e6d0', k: '#2a1a10', n: '#111', c: '#e8d2a8', e: '#fff' },
    px: [
      '................',
      '..aa........aa..',
      '.abba......abba.',
      '.abbaaaaaaaabba.',
      '..aaaaaaaaaaaa..',
      '.aaawwaaaawwaaa.',
      '.aakkeaaaaekkaa.',
      '.aakkkaaaakkkaa.',
      '.aaaawwnnwwaaaa.',
      '..aaawwwwwwaaa..',
      '...aaaaaaaaaa...',
      '..aaaaccccaaaa.a',
      '..aaacccccccaaab',
      '..aa.cccccc.aaab',
      '...kk.cccc.kk.b.',
      '................',
    ],
  },
  karasu: {
    pal: { k: '#23283a', h: '#3e4766', w: '#fff', y: '#e0a020' },
    px: [
      '................',
      '.....kkkk.......',
      '....kkkkkk......',
      '...kkwkkkkk.....',
      '..yykkkkkkkk....',
      '.yyy.kkhhkkkk...',
      '......khhhkkkkk.',
      '...kkkkhhhkkkkkk',
      '..kkkkkkhhkkkkk.',
      '.kkkkkkkkkkkk...',
      'kkkk.kkkkkkk....',
      '.......kkkk.....',
      '.......y..y.....',
      '......yy..yy....',
      '................',
      '................',
    ],
  },
  kitsune: {
    pal: { o: '#e0e8f0', p: '#b8c6d6', w: '#ffffff', k: '#2a2a3a', n: '#222', e: '#3a6ab0' },
    px: [
      '................',
      '..o..........o..',
      '..oo........oo..',
      '..opo......opo..',
      '..oooooooooooo..',
      '.oooekooookeooo.',
      '.oowwoooooowwoo.',
      '..owwwwnnwwwwo..',
      '...owwwwwwwwo...',
      '....oooooooo....',
      '...oooooooooo...',
      '..oooowwwwoooo.o',
      '..ooowwwwwwooooo',
      '..oo.wwwwww.oopo',
      '...kk......kk.pp',
      '................',
    ],
  },
  inoshishi: {
    pal: { b: '#6a4a30', d: '#4a3220', s: '#c89070', n: '#222', t: '#fff', k: '#222', e: '#ff4a2a' },
    px: [
      '................',
      '................',
      '....dd..........',
      '...bbbdbdbdb....',
      '..bbbbbbbbbbbb..',
      '.bbekbbbbbbbbbd.',
      '.bbkkbbbbbbbbbbd',
      'sbbbbbbbbbbbbbbb',
      'ssnbbbbbbbbbbbbb',
      '.ssbbbbbbbbbbbb.',
      '..t.bbbbbbbbbb..',
      '..t.bb.bb..bb.bb',
      '....kk.kk..kk.kk',
      '................',
      '................',
      '................',
    ],
  },
};

// おんがく（1こ ＝ 8ぶおんぷ。「-」は のばす、「.」は やすみ。m=メロディ、b=ベース）
const SONGS = {
  field: { bpm: 96, mw: 'triangle', mv: .11, bw: 'triangle', bv: .09,
    m: 'A4 - C5 - D5 - E5 - G5 - E5 D5 E5 - - - D5 - C5 - A4 - C5 - D5 - - - - - - - A4 - C5 - D5 - E5 - D5 - C5 A4 G4 - - - E4 - G4 - A4 - C5 - A4 - - - - - . .',
    b: 'A2 - - - E3 - - - C3 - - - G3 - - - F2 - - - C3 - - - G2 - - - D3 - - - A2 - - - E3 - - - F2 - - - C3 - - - E2 - - - B2 - - - A2 - - - E3 - - -' },
  night: { bpm: 74, mw: 'triangle', mv: .1, bw: 'triangle', bv: .08,
    m: 'A4 - C5 - D5 - E5 - G5 - E5 D5 E5 - - - D5 - C5 - A4 - C5 - D5 - - - - - - - A4 - C5 - D5 - E5 - D5 - C5 A4 G4 - - - E4 - G4 - A4 - C5 - A4 - - - - - . .',
    b: 'A2 - - - E3 - - - C3 - - - G3 - - - F2 - - - C3 - - - G2 - - - D3 - - - A2 - - - E3 - - - F2 - - - C3 - - - E2 - - - B2 - - - A2 - - - E3 - - -' },
  town: { bpm: 120, mw: 'square', mv: .05, bw: 'triangle', bv: .1,
    m: 'C5 - E5 - G5 - E5 - A5 - G5 - E5 - - - D5 - E5 - G5 - E5 D5 C5 - - - - - . . E5 - G5 - A5 - C6 - A5 - G5 - E5 - D5 - C5 - D5 - E5 - D5 - C5 - - - - - . .',
    b: 'C3 - G3 - C3 - G3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - C3 - G3 - C3 - . -' },
  battle: { bpm: 160, mw: 'square', mv: .055, bw: 'triangle', bv: .12,
    m: 'A4 . A4 . C5 . A4 D5 - . E5 . D5 C5 A4 . G4 . G4 . B4 . G4 C5 - . D5 . C5 B4 G4 . F4 . A4 . C5 . F5 - E5 . C5 . A4 . F4 . E4 . G#4 . B4 . E5 - D5 . B4 . G#4 . E4 .',
    b: 'A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 G2 G3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3' },
  boss: { bpm: 140, mw: 'square', mv: .055, bw: 'sawtooth', bv: .05,
    m: 'E5 - F5 - E5 - B4 - C5 - B4 - A4 - F4 - E4 - F4 - A4 - B4 - C5 - B4 - F5 - E5 - E5 . E5 . F5 . E5 . B4 - C5 - A4 - - - F4 - A4 - B4 - C5 - B4 - - - E4 - - -',
    b: 'E2 E2 B2 E2 E2 B2 E2 F2 E2 E2 B2 E2 E2 B2 E2 F2 F2 F2 C3 F2 F2 C3 F2 E2 F2 F2 C3 F2 F2 C3 F2 E2 E2 E2 B2 E2 E2 B2 E2 F2 A2 A2 E3 A2 A2 E3 A2 B2 F2 F2 C3 F2 F2 C3 F2 E2 E2 E2 B2 E2 E2 B2 E2 E2' },
  sad: { bpm: 66, mw: 'triangle', mv: .12, bw: 'triangle', bv: .07,
    m: 'E5 - - - D5 - C5 - B4 - - - A4 - - - C5 - - - B4 - A4 - E4 - - - - - - - F4 - - - A4 - B4 - C5 - - - B4 - A4 - B4 - - - E4 - F4 - E4 - - - - - . .',
    b: 'A2 - - - E3 - - - E2 - - - B2 - - - F2 - - - C3 - - - E2 - - - B2 - - - D2 - - - A2 - - - A2 - - - E3 - - - E2 - - - B2 - - - E2 - - - - - - -' },
};
