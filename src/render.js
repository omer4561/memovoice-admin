// בניית ה-HTML של המסכים. כל ערך שמגיע מהשרת עובר דרך esc, כי בין הערכים יש
// מילים של בודקים, מיילים ושמות ספרים. הפונקציות מחזירות מחרוזת (בלי DOM), כדי
// שאפשר יהיה לבדוק אותן ב-node --test בלי ספריות נוספות.
// מיילים ושמות ספרים עטופים ב-<bdi>, כדי שטקסט לועזי בתוך משפט עברי לא ישבור את הסדר.
import { addDays, dayDiff, esc, formatDate, formatDateTime, initials, israelDateKey, israelTodayKey } from './format.js';

const WINDOW = 14;
const GATE_PASS = 80;
const GATE_ATTEMPTS = 3;

function emailHtml(email, s) {
  return email ? `<bdi>${esc(email)}</bdi>` : `<span class="soft">${esc(s.noEmail)}</span>`;
}

function avatar(email, status) {
  return `<i class="av av-${esc(status)}" aria-hidden="true">${esc(initials(email))}</i>`;
}

function sinceText(days, s) {
  if (days === null) return s.neverTold;
  if (days === 0) return s.today;
  if (days === 1) return s.yesterday;
  return s.daysAgo(days);
}

function percent(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function isStuck(t) {
  const check = t.latestCheck;
  return Boolean(check && check.attempts >= GATE_ATTEMPTS && (check.score === null || check.score < GATE_PASS));
}

/** מי צריך אותך קודם: תקוע בשער, נעלם, מאט, פעיל. בתוך אותה קבוצה, הוותיק בשקט קודם. */
function priority(t) {
  if (isStuck(t)) return 0;
  return { red: 1, orange: 2, green: 3 }[t.status] ?? 4;
}

/** 14 ריבועים, הישן ביותר מימין (כיוון הקריאה בעברית) והיום משמאל. ריבוע מלא = יום עם הזנה. */
function strip(activeDays, today, s) {
  const on = new Set(activeDays ?? []);
  let filled = 0;
  const squares = [];
  for (let i = WINDOW - 1; i >= 0; i--) {
    const isOn = on.has(addDays(today, -i));
    if (isOn) filled += 1;
    squares.push(`<span class="sq${isOn ? ' on' : ''}${i === 0 ? ' today' : ''}"></span>`);
  }
  return `<div class="stripbox"><div class="strip" role="img" aria-label="${esc(s.stripLabel(filled))}">${squares.join('')}</div><div class="strip-axis" aria-hidden="true"><span>${esc(s.stripStart)}</span><span>${esc(s.stripEnd)}</span></div></div>`;
}

function kpiTile(name, value, label, note = '') {
  return `<div class="kpi" data-kpi="${name}"${value === 0 ? ' data-zero' : ''}><p class="kpi-num">${esc(value)}</p>${note ? `<p class="kpi-of">${esc(note)}</p>` : ''}<p class="kpi-label">${esc(label)}</p></div>`;
}

function renderKpis(data, s) {
  const { registered, toldToday } = data.totals;
  const share = Math.min(100, percent(toldToday, registered));
  const active7 = data.testers.filter((t) => (t.activeDays ?? []).some((d) => dayDiff(d, data.today) < 7)).length;
  const notStarted = data.testers.filter((t) => t.lastEntryDate === null).length;
  const hero = `<div class="kpi kpi-hero" data-kpi="told"><svg class="ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="ring-bg" cx="18" cy="18" r="15.9155"/>${share > 0 ? `<circle class="ring-fg" cx="18" cy="18" r="15.9155" stroke-dasharray="${share} 100"/>` : ''}</svg><div><p class="kpi-num">${esc(toldToday)}</p><p class="kpi-of">${esc(s.kpiOf(registered))}</p><p class="kpi-label">${esc(s.kpiToldToday)}</p></div></div>`;
  return `<section class="kpis">${hero}${kpiTile('active7', active7, s.kpiActive7)}${kpiTile('notstarted', notStarted, s.kpiNotStarted)}${kpiTile('passed', data.funnel.passedFirstCheck, s.kpiPassed, s.kpiOf(registered))}</section>`;
}

function renderCallout(data, s) {
  // שורה אחת לכל בודק, גם אם יש לו כמה סיבות (נעלם וגם תקוע בשער).
  const byTester = new Map();
  for (const a of data.attention.filter((item) => item.reason !== 'never_told')) {
    const entry = byTester.get(a.userId) ?? { email: a.email, reasons: [] };
    entry.reasons.push(a.reason === 'inactive' ? s.reasonInactive(a.days) : s.reasonStuck);
    byTester.set(a.userId, entry);
  }
  if (!byTester.size) return '';
  const rows = [...byTester.entries()]
    .map(([userId, e]) => `<li><a href="#/tester/${esc(userId)}">${emailHtml(e.email, s)}</a><span class="reason">${esc(e.reasons.join(' · '))}</span></li>`)
    .join('');
  return `<section class="callout"><h2>${esc(s.attentionNowTitle)}</h2><ul class="ledger">${rows}</ul></section>`;
}

function checkChip(check, s) {
  if (!check) return `<span class="soft">${esc(s.checkNone)}</span>`;
  const attempts = `<span class="soft small">${esc(s.attemptsLabel(check.attempts))}</span>`;
  if (check.score === null) return `<span class="chip c-none">${esc(s.noScore)}</span> ${attempts}`;
  return `<span class="chip c-${check.score >= GATE_PASS ? 'green' : 'red'}">${esc(check.score)}</span> ${attempts}`;
}

function renderCard(t, data, s, withTime) {
  const stuck = isStuck(t)
    ? `<span class="chip c-red">${esc(s.stuckChip)}</span>`
    : '';
  const owner = t.isOwner ? `<span class="pill">${esc(s.ownerTag)}</span>` : '';
  const book = [t.lastEntryBook ? `<bdi>${esc(t.lastEntryBook)}</bdi>` : '', t.lastEntryPages ? esc(s.pages(t.lastEntryPages.from, t.lastEntryPages.to)) : ''].filter(Boolean).join(' · ');
  const last = `<div class="tlast"><p><span class="soft">${esc(s.lastEntryLabel)}</span> <b>${esc(sinceText(t.daysSince, s))}</b> · <span class="num">${esc(formatDate(t.lastEntryDate))}</span></p>${book ? `<p class="soft">${book}</p>` : ''}</div>`;
  const time = withTime
    ? `<div><dt>${esc(s.statTime)}</dt><dd>${esc(s.timeCell(t.activeMinutes7d ?? 0, t.opens7d ?? 0))}</dd></div>`
    : '';
  return `<article class="tcard s-${esc(t.status)}">
<header class="thead2">${avatar(t.email, t.status)}<div class="tid"><a class="tlink" href="#/tester/${esc(t.userId)}">${emailHtml(t.email, s)}</a><div class="chips-row"><span class="chip c-${esc(t.status)}">${esc(s.status[t.status] ?? '')}</span>${stuck}${owner}</div></div></header>
${strip(t.activeDays, data.today, s)}
${last}
<dl class="tstats"><div><dt>${esc(s.statStreak)}</dt><dd>${esc(s.streakDays(t.streak))}</dd></div><div><dt>${esc(s.statBooks)}</dt><dd>${esc(s.booksCell(t.booksStarted, t.booksFinished))}</dd></div><div><dt>${esc(s.statCheck)}</dt><dd>${checkChip(t.latestCheck, s)}</dd></div>${time}</dl>
</article>`;
}

function renderCards(data, s) {
  const told = data.testers
    .filter((t) => t.lastEntryDate !== null)
    .sort((a, b) => priority(a) - priority(b) || (b.daysSince ?? 0) - (a.daysSince ?? 0));
  const withTime = data.timeTracking.available;
  const body = told.length
    ? `<div class="cards">${told.map((t) => renderCard(t, data, s, withTime)).join('')}</div>`
    : `<p class="soft">${esc(s.cardsNone)}</p>`;
  const notes = [s.thresholdNote, withTime ? '' : s.timeNote].filter(Boolean).map((n) => `<p class="note">${esc(n)}</p>`).join('');
  return `<section class="block bare"><h2>${esc(s.cardsTitle)}</h2>${body}${notes}</section>`;
}

function renderNotStarted(data, s) {
  const never = data.testers.filter((t) => t.lastEntryDate === null);
  if (!never.length) return '';
  const ages = never.map((t) => dayDiff(israelDateKey(t.registeredAt), data.today));
  const chips = never
    .map((t, i) => `<li><a class="chip-link" href="#/tester/${esc(t.userId)}">${avatar(t.email, 'never')}<span class="chip-text">${emailHtml(t.email, s)}<small>${esc(s.registeredAgo(ages[i]))}</small></span></a></li>`)
    .join('');
  return `<section class="block"><h2>${esc(s.notStartedTitle)} <span class="count">${never.length}</span></h2><p class="note">${esc(s.notStartedNote(Math.max(...ages)))}</p><ul class="chips">${chips}</ul></section>`;
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
      const drop = i === 0 ? '' : ` · ${s.funnelDrop(steps[i - 1][1] - count)}`;
      return `<li><div class="f-top"><span>${esc(label)}</span><b class="num">${esc(count)}</b></div><div class="f-bar" aria-hidden="true"><span style="inline-size:${share}%"></span></div><p class="f-meta">${share}%${esc(drop)}</p></li>`;
    })
    .join('');
  return `<section class="block"><h2>${esc(s.funnelTitle)}</h2><ol class="funnel">${rows}</ol></section>`;
}

function shortDate(key) {
  return formatDate(key).slice(0, 5);
}

function renderApi(data, s) {
  const title = `<h2>${esc(s.apiTitle)} <span class="count">${esc(s.apiSub)}</span></h2>`;
  if (!data.apiUsage.length) {
    return `<section class="block">${title}<p class="soft">${esc(s.apiNone)}</p></section>`;
  }
  const days = data.apiUsage;
  const ceiling = data.apiEstimatedDailyCeiling;
  const maxCalls = Math.max(...days.map((d) => d.calls));
  const max = Math.max(ceiling, maxCalls, 1);
  const maxIndex = days.findIndex((d) => d.calls === maxCalls);

  // גרף ב-HTML ו-CSS ולא ב-SVG: הטקסט נשאר קריא בכל רוחב (SVG מתכווץ יחד עם הטקסט).
  // ב-RTL הילד הראשון בשורה יושב מימין, כך שהיום הישן ביותר מימין, כמו כיוון הקריאה.
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

  return `<section class="block">${title}<div aria-hidden="true">${chart}</div>${table}<p class="note">${esc(s.apiCeilingNote)}</p></section>`;
}

export function renderOverview(data, s) {
  const stamp = `<p class="note stamp">${esc(s.updatedAt)} ${esc(formatDateTime(data.generatedAt))}</p>`;

  if (data.totals.registered === 0) {
    return `<section class="empty"><p class="lede">${esc(s.testersNone)}</p></section>${renderApi(data, s)}${stamp}`;
  }

  return `${renderKpis(data, s)}${renderCallout(data, s)}${renderCards(data, s)}${renderNotStarted(data, s)}${renderFunnel(data, s)}${renderApi(data, s)}${stamp}`;
}

export function renderTesterDetail(data, s, today = israelTodayKey()) {
  const days = [...new Set(data.history.map((h) => h.date))];
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
<header class="dhead">${avatar(data.email, 'never')}<div><h2 class="who">${emailHtml(data.email, s)}</h2><p class="note">${esc(s.detailEntries(data.history.length))}</p></div></header>
<div class="dstrip">${strip(days, today, s)}<p class="note">${esc(s.stripCaption)}</p></div>
${last}
<section class="block"><h2>${esc(s.detailHistory)}</h2>${history}</section>`;
}
