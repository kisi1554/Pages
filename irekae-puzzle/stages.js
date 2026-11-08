/* かもつ いれかえ パズル の ステージ（tools/irekae-puzzle-gen.js が つくる。てで なおさない）
 * tracks: せんろ の ていいん [しゅっぱつ せん, わきせん1, …]、H: ひきあげせん で ひける かず
 * start.tr: せんろ ごと の かしゃ（おく → てまえ）、start.loco: きかんしゃ に つながった かしゃ（きかんしゃ がわ から）
 * goal: ちゅうもん（ひだり → みぎ ＝ てまえ → おく、* は どれ で も）、keep: その しゅるい を のこす せんろ
 * par: さいたん てかず（ソルバー で もとめた もの）
 */
(function (root) {
  var STAGES = [
  {"id":1,"tracks":[3,3],"H":3,"start":{"loco":"","tr":["rb","g"]},"goal":"gbr","par":2,"tip":"▶ で わきせん へ。かしゃ に くっついたら、つれて かえる かず を えらんで ◀"},
  {"id":2,"tracks":[3,3],"H":3,"start":{"loco":"","tr":["r","bg"]},"goal":"gbr","par":2,"tip":"しゅっぱつ せん に いれて、ぜんぶ おいて くれば できあがり"},
  {"id":3,"tracks":[3,3],"H":3,"start":{"loco":"","tr":["gr","b"]},"goal":"rbg","par":3,"tip":"きかんしゃ の うしろ に つないだ まま、ほか の せんろ へ いける よ"},
  {"id":4,"tracks":[3,3],"H":3,"start":{"loco":"","tr":["b","gr"]},"goal":"brg","par":3},
  {"id":5,"tracks":[3,3],"H":3,"start":{"loco":"","tr":["r","gb"]},"goal":"brg","par":4,"tip":"いちど わきせん に おいて おく と、じゅんばん が かえられる"},
  {"id":6,"tracks":[3,3],"H":2,"start":{"loco":"","tr":["g","br"]},"goal":"brg","par":4,"tip":"この えき の ひきあげせん は みじかい。2りょう までしか ひけない"},
  {"id":7,"tracks":[3,3],"H":2,"start":{"loco":"","tr":["g","rb"]},"goal":"rgb","par":5},
  {"id":8,"tracks":[3,2],"H":2,"start":{"loco":"","tr":["br","y"]},"goal":"ybr","par":7,"tip":"わきせん も みじかい。2りょう まで"},
  {"id":9,"tracks":[3,3],"H":2,"start":{"loco":"","tr":["b","rg"]},"goal":"bgr","par":8},
  {"id":10,"tracks":[3,2],"H":2,"start":{"loco":"","tr":["b","yr"]},"goal":"bry","par":8},
  {"id":11,"tracks":[4,3,3],"H":3,"start":{"loco":"","tr":["g","br","y"]},"goal":"rbyg","par":3,"tip":"わきせん が 2ほん に なった！"},
  {"id":12,"tracks":[4,3,3],"H":3,"start":{"loco":"yb","tr":["","g","r"]},"goal":"rybg","par":4},
  {"id":13,"tracks":[4,3,3],"H":3,"start":{"loco":"","tr":["","rby","g"]},"goal":"gbry","par":5},
  {"id":14,"tracks":[4,3,3],"H":3,"start":{"loco":"","tr":["b","y","rg"]},"goal":"ygbr","par":6},
  {"id":15,"tracks":[4,3,2],"H":2,"start":{"loco":"","tr":["ygb","r",""]},"goal":"grby","par":5,"tip":"みじかい わきせん に いれて だす と、まえ と うしろ が いれかわる"},
  {"id":16,"tracks":[4,3,2],"H":2,"start":{"loco":"","tr":["by","rg",""]},"goal":"ygrb","par":6},
  {"id":17,"tracks":[4,3,2],"H":2,"start":{"loco":"","tr":["b","gy","r"]},"goal":"yrbg","par":7},
  {"id":18,"tracks":[4,3,2],"H":2,"start":{"loco":"","tr":["br","y","g"]},"goal":"gbry","par":8},
  {"id":19,"tracks":[5,3,3],"H":3,"start":{"loco":"","tr":["yb","r","gp"]},"goal":"grbyp","par":6,"tip":"5りょう の ながい れっしゃ"},
  {"id":20,"tracks":[5,3,3],"H":3,"start":{"loco":"p","tr":["","b","ryg"]},"goal":"rgpby","par":7},
  {"id":21,"tracks":[5,3,3],"H":3,"start":{"loco":"","tr":["p","rb","yg"]},"goal":"gpbyr","par":8},
  {"id":22,"tracks":[5,3,3],"H":3,"start":{"loco":"","tr":["rg","pyb",""]},"goal":"rgpyb","par":9},
  {"id":23,"tracks":[5,3,2],"H":2,"start":{"loco":"","tr":["bp","y","rg"]},"goal":"ygbrp","par":9},
  {"id":24,"tracks":[5,3,2],"H":2,"start":{"loco":"","tr":["yr","g","bp"]},"goal":"rypgb","par":10},
  {"id":25,"tracks":[5,3,2],"H":2,"start":{"loco":"","tr":["rg","pby",""]},"goal":"byrpg","par":11},
  {"id":26,"tracks":[5,2,2,2],"H":2,"start":{"loco":"","tr":["yb","gw","","pr"]},"goal":"rpbgy","par":7,"tip":"わきせん が 3ぼん。つかわない かしゃ も ある よ"},
  {"id":27,"tracks":[5,2,2,2],"H":2,"start":{"loco":"","tr":["","wy","bg","rp"]},"goal":"rgwyb","par":8},
  {"id":28,"tracks":[5,2,2,2],"H":2,"start":{"loco":"b","tr":["g","y","r","pw"]},"goal":"ypgbw","par":9},
  {"id":29,"tracks":[5,3,2,2],"H":3,"start":{"loco":"","tr":["kb","wp","y","rg"]},"goal":"w*kgp","par":7,"tip":"❔ の ところ は どの かしゃ で も いい"},
  {"id":30,"tracks":[5,3,2,2],"H":3,"start":{"loco":"","tr":["krp","wy","b","g"]},"goal":"*gkyw","par":8},
  {"id":31,"tracks":[5,3,2,2],"H":3,"start":{"loco":"","tr":["pby","","wk","rg"]},"goal":"w*rgk","par":9},
  {"id":32,"tracks":[4,3,2,2],"H":3,"start":{"loco":"r","tr":["px","w","b","gy"]},"goal":"pwry","par":7,"keep":{"t":"x","tr":3},"tip":"🔧 こわれた かしゃ は しゅうり の せんろ に のこそう"},
  {"id":33,"tracks":[4,3,2,2],"H":3,"start":{"loco":"","tr":["bxy","","rp","wg"]},"goal":"bgwp","par":8,"keep":{"t":"x","tr":3}},
  {"id":34,"tracks":[4,3,2,2],"H":3,"start":{"loco":"","tr":["pw","ybr","gx",""]},"goal":"yrpw","par":9,"keep":{"t":"x","tr":3}},
  {"id":35,"tracks":[5,3,3,2],"H":3,"start":{"loco":"","tr":["bp","er","ky","wg"]},"goal":"ewprg","par":8,"tip":"8りょう！ めいじん への みち"},
  {"id":36,"tracks":[5,3,3,2],"H":3,"start":{"loco":"g","tr":["p","b","rew","yk"]},"goal":"grewk","par":9},
  {"id":37,"tracks":[5,3,3,2],"H":3,"start":{"loco":"","tr":["xk","bgw","p","yr"]},"goal":"kywrp","par":9,"keep":{"t":"x","tr":2}},
  {"id":38,"tracks":[5,3,3,2],"H":3,"start":{"loco":"","tr":["krpw","gb","x","y"]},"goal":"brkpy","par":10,"keep":{"t":"x","tr":2}},
  {"id":39,"tracks":[5,3,3,3],"H":3,"start":{"loco":"","tr":["kwkb","","rp","gy"]},"goal":"ybr*w","par":10},
  {"id":40,"tracks":[5,3,3,3],"H":3,"start":{"loco":"y","tr":["gbwpk","r","k",""]},"goal":"*gbkr","par":11,"tip":"さいご の もんだい。さき を よんで うごかそう"}
  ];
  if (typeof module === "object" && module.exports) module.exports = STAGES;
  else root.IREKAE_STAGES = STAGES;
})(this);
