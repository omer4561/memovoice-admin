// בניית ה-HTML של המסכים. כל ערך שמגיע מהשרת עובר דרך esc, כי בין הערכים יש
// מילים של בודקים, מיילים ושמות ספרים. הפונקציות מחזירות מחרוזת (בלי DOM), כדי
// שאפשר יהיה לבדוק אותן ב-node --test בלי ספריות נוספות.
// מיילים ושמות ספרים עטופים ב-<bdi>, כדי שטקסט לועזי בתוך משפט עברי לא ישבור את הסדר.
import { esc, formatDate, formatDateTime } from './format.js';

function emailHtml(email, s) {
  return email ? `<bdi>${esc(email)}</bdi>` : `<span class="soft">${esc(s.noEmail)}</span>`;
}

function testerLink(userId, email, s) {
  return `<a href="#/tester/${esc(userId)}">${emailHtml(email, s)}</a>`;
}

function sinceText(days, s) {
  if (days === null) return s.neverTold;
  if (days === 0) return s.today;
  if (days === 1) return s.yesterday;
  return s.daysAgo(days);
}

function reasonText(item, s) {
  if (item.reason === 'inactive') return s.reasonInactive(item.days);
  if (item.reason === 'never_told') return s.reasonNeverTold(item.days);
  return s.reasonStuck;
}

function percent(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function renderAttention(data, s) {
  const items = data.attention.length
    ? data.attention
        .map(
          (item) =>
            `<li><i class="mark" aria-hidden="true"></i>${testerLink(item.userId, item.email, s)}<span class="reason">${esc(reasonText(item, s))}</span></li>`
        )
        .join('')
    : `<li class="soft">${esc(s.attentionNone)}</li>`;
  return `<section class="block"><h2>${esc(s.attentionTitle)}</h2><ul class="ledger">${items}</ul><p class="note">${esc(s.thresholdNote)}</p></section>`;
}

function renderFunnel(data, s) {
  const f = data.funnel;
  const steps = [
    [s.funnelRegistered, f.registered],
    [s.funnelAddedBook, f.addedBook],
    [s.funnelToldFirst, f.toldFirstTime],
    [s.funnelPassedFirst, f.passedFirstCheck],
  ];
  const rows = steps
    .map(([label, count], i) => {
      const share = percent(count, f.registered);
      const drop = i === 0 ? '' : esc(s.funnelDrop(steps[i - 1][1] - count));
      return `<tr><th scope="row">${esc(label)}</th><td class="num">${esc(count)}</td><td class="num">${share}%<span class="meter" aria-hidden="true"><span style="inline-size:${share}%"></span></span></td><td class="soft">${drop}</td></tr>`;
    })
    .join('');
  return `<section class="block"><h2>${esc(s.funnelTitle)}</h2><table class="funnel"><thead><tr><th scope="col">${esc(s.funnelStep)}</th><th scope="col">${esc(s.funnelCount)}</th><th scope="col">${esc(s.funnelShare)}</th><th scope="col">${esc(s.funnelDropCol)}</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function shortDate(key) {
  return formatDate(key).slice(0, 5);
}

function renderApi(data, s) {
  if (!data.apiUsage.length) {
    return `<section class="block"><h2>${esc(s.apiTitle)}</h2><p class="soft">${esc(s.apiNone)}</p></section>`;
  }
  const days = data.apiUsage;
  const ceiling = data.apiEstimatedDailyCeiling;
  const maxCalls = Math.max(...days.map((d) => d.calls));
  const max = Math.max(ceiling, maxCalls, 1);
  const maxIndex = days.findIndex((d) => d.calls === maxCalls);

  // גרף ב-HTML ו-CSS ולא ב-SVG: הטקסט נשאר קריא בכל רוחב (SVG מתכווץ יחד עם הטקסט).
  // ב-RTL הילד הראשון בשורה יושב מימין, כך שהיום הישן ביותר מימין, כמו כיוון הקריאה.
  // מספרים על הגרף עצמו: הגבוה ביותר והאחרון, ולא רק tooltip של hover.
  const bars = days
    .map((d, i) => {
      const height = Math.max(1, Math.round((d.calls / max) * 100));
      const label = i === maxIndex || i === days.length - 1 ? `<b class="v">${esc(d.calls)}</b>` : '';
      return `<span class="bar" style="block-size:${height}%">${label}</span>`;
    })
    .join('');
  const ceilingPct = Math.min(100, Math.round((ceiling / max) * 100));
  const chart = `<div class="chart"><div class="plot"><div class="ceil" style="inset-block-end:${ceilingPct}%"><span>${esc(s.apiCeilingLabel(ceiling))}</span></div><div class="bars">${bars}</div></div><div class="axis"><span>${esc(shortDate(days[0].date))}</span><span>${esc(shortDate(days[days.length - 1].date))}</span></div></div>`;

  const table = `<table class="sr-only"><caption>${esc(s.apiTitle)}</caption><thead><tr><th scope="col">${esc(s.apiDate)}</th><th scope="col">${esc(s.apiCalls)}</th></tr></thead><tbody>${days
    .map((d) => `<tr><td>${esc(formatDate(d.date))}</td><td>${esc(d.calls)}</td></tr>`)
    .join('')}</tbody></table>`;

  return `<section class="block"><h2>${esc(s.apiTitle)}</h2><div aria-hidden="true">${chart}</div>${table}<p class="note">${esc(s.apiCeilingNote)}</p></section>`;
}

function renderTesters(data, s) {
  const withTime = data.timeTracking.available;
  const head = [s.colTester, s.colStatus, s.colLastEntry, s.colSince, s.colStreak, s.colBooks, s.colCheck, ...(withTime ? [s.colTime] : [])]
    .map((label) => `<div role="columnheader">${esc(label)}</div>`)
    .join('');

  const rows = data.testers
    .map((t) => {
      const last = t.lastEntryDate
        ? `<span class="num">${esc(formatDate(t.lastEntryDate))}</span><br><span class="soft small">${t.lastEntryBook ? `<bdi>${esc(t.lastEntryBook)}</bdi>` : ''}${t.lastEntryPages ? ` · ${esc(s.pages(t.lastEntryPages.from, t.lastEntryPages.to))}` : ''}</span>`
        : `<span class="soft">${esc(s.neverTold)}</span>`;
      const check = t.latestCheck
        ? esc(s.checkCell(t.latestCheck.score, t.latestCheck.attempts))
        : `<span class="soft">${esc(s.checkNone)}</span>`;
      const owner = t.isOwner ? ` <span class="pill">${esc(s.ownerTag)}</span>` : '';
      const time = withTime
        ? `<div class="cell" role="cell" data-label="${esc(s.colTime)}">${esc(s.timeCell(t.activeMinutes7d ?? 0, t.opens7d ?? 0))}</div>`
        : '';
      return `<div class="trow" role="row">
<div class="cell c-who" role="cell">${testerLink(t.userId, t.email, s)}${owner}</div>
<div class="cell" role="cell" data-label="${esc(s.colStatus)}"><span class="status s-${esc(t.status)}"><i aria-hidden="true"></i>${esc(s.status[t.status] ?? '')}</span></div>
<div class="cell c-last" role="cell" data-label="${esc(s.colLastEntry)}">${last}</div>
<div class="cell" role="cell" data-label="${esc(s.colSince)}">${esc(sinceText(t.daysSince, s))}</div>
<div class="cell" role="cell" data-label="${esc(s.colStreak)}">${esc(s.streakDays(t.streak))}</div>
<div class="cell" role="cell" data-label="${esc(s.colBooks)}">${esc(s.booksCell(t.booksStarted, t.booksFinished))}</div>
<div class="cell" role="cell" data-label="${esc(s.colCheck)}">${check}</div>
${time}</div>`;
    })
    .join('');

  const note = withTime ? '' : `<p class="note">${esc(s.timeNote)}</p>`;
  return `<section class="block"><h2>${esc(s.testersTitle)}</h2>${note}<div class="ledger-table${withTime ? ' has-time' : ''}" role="table" aria-label="${esc(s.testersTitle)}"><div class="thead" role="row">${head}</div>${rows}</div></section>`;
}

export function renderOverview(data, s) {
  const registered = data.totals.registered;
  const attentionCount = new Set(data.attention.map((item) => item.userId)).size;
  const lede = `<p class="lede">${esc(s.lede(registered, data.totals.toldToday, attentionCount))}</p>`;
  const stamp = `<p class="note">${esc(s.updatedAt)} ${esc(formatDateTime(data.generatedAt))}</p>`;

  if (registered === 0) return `${lede}${renderApi(data, s)}${stamp}`;

  return `${lede}${renderAttention(data, s)}${renderTesters(data, s)}${renderFunnel(data, s)}${renderApi(data, s)}${stamp}`;
}

export function renderTesterDetail(data, s) {
  const history = data.history.length
    ? `<table class="history"><thead><tr><th scope="col">${esc(s.colDate)}</th><th scope="col">${esc(s.colBook)}</th><th scope="col">${esc(s.colPages)}</th></tr></thead><tbody>${data.history
        .map(
          (h) =>
            `<tr><td class="num">${esc(formatDate(h.date))}</td><td><bdi>${esc(h.bookTitle)}</bdi></td><td>${esc(s.pages(h.pageFrom, h.pageTo))}</td></tr>`
        )
        .join('')}</tbody></table>`
    : `<p class="soft">${esc(s.detailHistoryNone)}</p>`;

  const last = data.lastEntry
    ? `<section class="block"><h2>${esc(s.detailLastEntry)}</h2>
<p class="note"><span class="num">${esc(formatDate(data.lastEntry.date))}</span> · <bdi>${esc(data.lastEntry.bookTitle)}</bdi> · ${esc(s.pages(data.lastEntry.pageFrom, data.lastEntry.pageTo))}</p>
<h3>${esc(s.detailSaid)}</h3>
<p class="said" dir="auto">${data.lastEntry.text ? esc(data.lastEntry.text) : `<span class="soft">${esc(s.detailNoText)}</span>`}</p></section>`
    : '';

  return `<a class="back" href="#/">${esc(s.back)}</a>
<h2 class="who">${emailHtml(data.email, s)}</h2>
${last}
<section class="block"><h2>${esc(s.detailHistory)}</h2>${history}</section>`;
}
