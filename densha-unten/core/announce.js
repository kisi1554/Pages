// 車内アナウンスの文。画面に出す文（text）と、読み上げ用のかなの文（speech）を組み立てる。
// 読み上げは かな で行う（駅名の漢字を読みまちがえないように）。

const SIDE = { left: ["左", "ひだり"], right: ["右", "みぎ"] };

function transfers(st) {
  if (!st.transfers || !st.transfers.length) return { text: "", speech: "" };
  return {
    text: st.transfers.map(t => t.name).join("、") + "は、お乗り換えです。",
    speech: st.transfers.map(t => t.kana).join("、") + "は、おのりかえです。",
  };
}

function doors(st) {
  const [k, kana] = SIDE[st.doors] || SIDE.left;
  return { text: `お出口は、${k}側です。`, speech: `おでぐちは、${kana}がわです。` };
}

/**
 * kind:
 *   "start"  … 始発駅で: 路線名と行き先
 *   "next"   … 発車したあと: 次は〇〇（乗りかえ・ドアの側）
 *   "soon"   … 駅の手前: まもなく〇〇
 *   "arrive" … 終着でドアが開いたとき
 * i: 対象の駅の番号
 */
export function announcement(route, kind, i) {
  const st = route.stations[i];
  const last = route.stations[route.stations.length - 1];
  const isLast = i === route.stations.length - 1;
  const m = route.meta, tt = route.timetable;
  switch (kind) {
    case "start":
      return {
        text: `今日も、${m.name}をご利用いただきまして、ありがとうございます。この電車は、${tt.type}、${last.name}行きです。`,
        speech: `きょうも、${m.kana}を ごりよう いただきまして、ありがとうございます。このでんしゃは、${tt.typeKana || tt.type}、${last.kana}ゆきです。`,
      };
    case "next": {
      if (isLast) {
        const d = doors(st), tr = transfers(st);
        return {
          text: `次は、終点、${st.name}、${st.name}です。${tr.text}${d.text}`,
          speech: `つぎは、しゅうてん、${st.kana}、${st.kana}です。${tr.speech}${d.speech}`,
        };
      }
      const d = doors(st), tr = transfers(st);
      return {
        text: `次は、${st.name}、${st.name}。${tr.text}${d.text}`,
        speech: `つぎは、${st.kana}、${st.kana}。${tr.speech}${d.speech}`,
      };
    }
    case "soon": {
      const d = doors(st);
      if (isLast) {
        return {
          text: `まもなく、終点、${st.name}です。${d.text}お忘れ物のないよう、ご注意ください。`,
          speech: `まもなく、しゅうてん、${st.kana}です。${d.speech}おわすれものの ないよう、ごちゅうい ください。`,
        };
      }
      return { text: `まもなく、${st.name}です。${d.text}`, speech: `まもなく、${st.kana}です。${d.speech}` };
    }
    case "arrive":
      return {
        text: `${st.name}、${st.name}、終点です。今日も、${m.name}をご利用いただきまして、ありがとうございました。`,
        speech: `${st.kana}、${st.kana}、しゅうてんです。きょうも、${m.kana}を ごりよう いただきまして、ありがとうございました。`,
      };
    default:
      return null;
  }
}

/**
 * いつ「まもなく」を流すか: 停止位置の手前の距離 (m)。駅間が短いときは駅間の4割まで
 */
export function soonDistance(route, i) {
  const gap = i > 0 ? route.stations[i].stop - route.stations[i - 1].stop : 1000;
  return Math.min(450, gap * 0.4);
}

/** 発車して何m 進んだら「次は」を流すか（ホームを出たあたり） */
export const NEXT_AFTER = 120;
