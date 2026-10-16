/* ============================================================
   ちずきごう たからさがし — ステージの データ（15 ステージ）
   tools/chizu-takara/gen-stages.js で つくった もの。てで なおしても よい
   （なおしたら node --test chizu-takara/tests/*.test.js で ヒントが たどれるか たしかめる）。
   map の もじ: . は なにも ない マス。ほかは symbols.js の code。
   start / treasure は [x, y]（x は ひがしへ、y は みなみへ）。
   ============================================================ */
(function (root) {
  "use strict";
  var STAGES = [
    {
      "id":1, "title":"はじめての たからさがし", "dirs":4, "showDir":true, "showName":true, "start":[6,7], "treasure":[7,1],
      map: [
        ".F...C.K",
        "....hhh.",
        "R...hhhT",
        "hhh.....",
        "hhh..H..",
        "=====E==",
        "..Gcc...",
        "...ccB.."
      ],
      hints: [
        {"type":"from","sym":"G","dir":"n","n":3},
        {"type":"goto","sym":"T"},
        {"type":"toward","sym":"K","dir":"n","n":1}
      ]
    },
    {
      "id":2, "title":"えきまえの まち", "dirs":4, "showDir":true, "showName":true, "start":[7,7], "treasure":[2,1],
      map: [
        "P.....B.",
        "...K.ccc",
        "..oooccc",
        "F.oooC..",
        ".nn.....",
        ".nnD....",
        "--------",
        "...S..H."
      ],
      hints: [
        {"type":"from","sym":"P","dir":"s","n":1},
        {"type":"toward","sym":"K","dir":"e","n":1},
        {"type":"toward","sym":"K","dir":"e","n":1}
      ]
    },
    {
      "id":3, "title":"たんぼの むら", "dirs":4, "showDir":true, "showName":true, "start":[7,7], "treasure":[7,1],
      map: [
        "..B...R.",
        "P..ttt..",
        "..Xttt..",
        ".......S",
        "..ooo...",
        "..oooJ.M",
        "...ttt..",
        "...tttT."
      ],
      hints: [
        {"type":"from","sym":"M","dir":"s","n":1},
        {"type":"toward","sym":"S","dir":"n","n":2},
        {"type":"move","dir":"n","n":3}
      ]
    },
    {
      "id":4, "title":"おてらと じんじゃ", "dirs":4, "showDir":true, "showName":true, "start":[6,7], "treasure":[3,7],
      map: [
        ".C.Rcccc",
        "....cccc",
        ".nnn..B.",
        ".nnnF...",
        "M.K.....",
        "=E======",
        "........",
        ".X...L.."
      ],
      hints: [
        {"type":"from","sym":"E","dir":"s","n":1},
        {"type":"move","dir":"s","n":1},
        {"type":"move","dir":"e","n":1},
        {"type":"toward","sym":"L","dir":"e","n":1}
      ]
    },
    {
      "id":5, "title":"こうじょうの まち", "dirs":4, "showDir":true, "showName":true, "start":[5,8], "treasure":[3,1],
      map: [
        ".P.....B.",
        "....F....",
        "---------",
        ".M...J.D.",
        ".........",
        ".C.ccKww.",
        "...cc.ww.",
        ".nnnG....",
        ".nnn..X.."
      ],
      hints: [
        {"type":"from","sym":"M","dir":"n","n":1},
        {"type":"move","dir":"e","n":1},
        {"type":"move","dir":"n","n":1},
        {"type":"toward","sym":"F","dir":"e","n":"until"}
      ]
    },
    {
      "id":6, "title":"もりの ちかくの まち", "dirs":4, "showDir":true, "showName":true, "start":[5,8], "treasure":[3,2],
      map: [
        ".....www.",
        ".D.H.www.",
        "........S",
        "ooo...nn.",
        "ooo.K.nnF",
        "..X...B..",
        "=======E=",
        "hhh.....L",
        "hhhJ..G.."
      ],
      hints: [
        {"type":"from","sym":"E","dir":"n","n":1},
        {"type":"toward","sym":"X","dir":"w","n":"until"},
        {"type":"move","dir":"s","n":3},
        {"type":"toward","sym":"H","dir":"n","n":"until"}
      ]
    },
    {
      "id":7, "title":"しやくしょの ある まち", "dirs":4, "showDir":true, "showName":true, "start":[7,8], "treasure":[1,1],
      map: [
        "X.....T..",
        "...M....B",
        "======E==",
        ".J..ttt..",
        "...Cttt..",
        ".........",
        "...hhh...",
        "ww.hhh..R",
        "wwD.L.P.."
      ],
      hints: [
        {"type":"from","sym":"J","dir":"e","n":1},
        {"type":"move","dir":"n","n":2},
        {"type":"move","dir":"w","n":2},
        {"type":"toward","sym":"M","dir":"e","n":1}
      ]
    },
    {
      "id":8, "title":"ななめに すすめ！", "dirs":8, "showDir":true, "showName":true, "start":[3,8], "treasure":[1,5],
      map: [
        "hh..C.K..",
        "hhJ...hh.",
        "....X.hh.",
        "hhh...hhh",
        "hhh.M.hhh",
        "..T......",
        "H.......B",
        "---------",
        "..P...G.."
      ],
      hints: [
        {"type":"from","sym":"H","dir":"ne","n":3},
        {"type":"toward","sym":"K","dir":"ne","n":1},
        {"type":"toward","sym":"K","dir":"ne","n":"until"},
        {"type":"toward","sym":"H","dir":"sw","n":"until"}
      ]
    },
    {
      "id":9, "title":"ちゃばたけの おか", "dirs":8, "showDir":true, "showName":true, "start":[8,8], "treasure":[6,4],
      map: [
        ".T..K..M.",
        "...ttt...",
        "hh.ttt...",
        "hh..P...S",
        "..Rcc....",
        "...cc..H.",
        "======E==",
        ".........",
        "G.F..D..."
      ],
      hints: [
        {"type":"from","sym":"D","dir":"nw","n":3},
        {"type":"toward","sym":"M","dir":"ne","n":"until"},
        {"type":"move","dir":"w","n":3},
        {"type":"toward","sym":"H","dir":"se","n":"until"}
      ]
    },
    {
      "id":10, "title":"かわぞいの まち", "dirs":8, "showDir":false, "showName":true, "start":[5,9], "treasure":[2,6],
      map: [
        ".F......oo",
        ".....nn.oo",
        "..S.Gnn.tt",
        "........tt",
        "..L.C.B...",
        "M.........",
        "....R.Hhhh",
        ".D.....hhh",
        "=====E====",
        "....P.J..."
      ],
      hints: [
        {"type":"from","sym":"S","dir":"w","n":2},
        {"type":"from","sym":"E","dir":"e","n":2},
        {"type":"move","dir":"n","n":3},
        {"type":"toward","sym":"G","dir":"nw","n":"until"},
        {"type":"toward","sym":"D","dir":"sw","n":"until"}
      ]
    },
    {
      "id":11, "title":"ふたつの せんろ", "dirs":8, "showDir":false, "showName":false, "start":[8,9], "treasure":[3,9],
      map: [
        ".ww...-M..",
        ".ww.cc-.ww",
        "S.T.cc-.ww",
        "..ww..-.B.",
        "..wwD.-nnn",
        "..R...-nnn",
        "----------",
        ".....J-...",
        "......-...",
        "P.F..L-C.G"
      ],
      hints: [
        {"type":"from","sym":"B","dir":"s","n":3},
        {"type":"toward","sym":"L","dir":"sw","n":1},
        {"type":"from","sym":"P","dir":"n","n":1},
        {"type":"move","dir":"se","n":1},
        {"type":"toward","sym":"C","dir":"e","n":2}
      ]
    },
    {
      "id":12, "title":"はくぶつかんの なぞ", "dirs":8, "showDir":false, "showName":false, "start":[9,9], "treasure":[7,4],
      map: [
        "Chh.ww....",
        ".hh.ww..P.",
        "..tt.M....",
        "K.tt......",
        ".........J",
        "..G.D..X..",
        "==E=======",
        ".....T...S",
        "F..cc.....",
        "...cc.L..."
      ],
      hints: [
        {"type":"from","sym":"T","dir":"w","n":3},
        {"type":"toward","sym":"D","dir":"ne","n":1},
        {"type":"move","dir":"ne","n":1},
        {"type":"toward","sym":"P","dir":"ne","n":3},
        {"type":"toward","sym":"X","dir":"s","n":"until"}
      ]
    },
    {
      "id":13, "title":"やまの むら", "dirs":8, "showDir":false, "showName":false, "start":[9,9], "treasure":[2,5],
      map: [
        "......H.ww",
        "...T....ww",
        ".X.....S..",
        "====E=====",
        "B...JcccL.",
        ".....ccc..",
        ".G...ccc..",
        "www..ccc.M",
        "www.K.....",
        ".P....R..."
      ],
      hints: [
        {"type":"from","sym":"B","dir":"e","n":1},
        {"type":"move","dir":"ne","n":1},
        {"type":"from","sym":"S","dir":"s","n":1},
        {"type":"toward","sym":"E","dir":"w","n":"until"},
        {"type":"move","dir":"n","n":1},
        {"type":"toward","sym":"G","dir":"sw","n":"until"}
      ]
    },
    {
      "id":14, "title":"おおきな まち", "dirs":8, "showDir":false, "showName":false, "start":[8,9], "treasure":[9,2],
      map: [
        ".P.....hhh",
        "...H...hhh",
        ".nnn......",
        ".nnnR.M...",
        "ooo......K",
        "ooo.......",
        "hhh.......",
        "hhh..X.S..",
        "----------",
        "F.D.B..C.G"
      ],
      hints: [
        {"type":"from","sym":"P","dir":"s","n":3},
        {"type":"move","dir":"e","n":2},
        {"type":"toward","sym":"S","dir":"se","n":"until"},
        {"type":"move","dir":"ne","n":3},
        {"type":"move","dir":"n","n":3},
        {"type":"toward","sym":"K","dir":"s","n":2}
      ]
    },
    {
      "id":15, "title":"さいごの たから", "dirs":8, "showDir":false, "showName":false, "start":[5,9], "treasure":[0,8],
      map: [
        "..R.B.....",
        "...www.H..",
        "..Cwww....",
        "....P.L.M.",
        "====E=====",
        "....T.....",
        "......tt..",
        ".nnnS.tt..",
        ".nnn..oo.K",
        "F.G...oo.."
      ],
      hints: [
        {"type":"from","sym":"L","dir":"se","n":2},
        {"type":"move","dir":"w","n":1},
        {"type":"move","dir":"n","n":1},
        {"type":"toward","sym":"G","dir":"sw","n":2},
        {"type":"toward","sym":"G","dir":"sw","n":"until"},
        {"type":"move","dir":"w","n":3}
      ]
    }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = STAGES;
  else root.CHIZU_STAGES = STAGES;
})(this);
