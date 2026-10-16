// בניית ה-HTML של המסכים. כל ערך שמגיע מהשרת עובר דרך esc, כי בין הערכים יש
// מילים של בודקים, מיילים ושמות ספרים. הפונקציות מחזירות מחרוזת (בלי DOM), כדי
// שאפשר יהיה לבדוק אותן ב-node --test בלי ספריות נוספות.
import { esc, formatDate, formatDateTime } from './format.js';

function emailOf(email, s) {
  return email ? esc(email) : `<span class="soft">${esc(s.noEmail)}</span>`;
}

function sinceText(days, s) {
  if (days === null) return s.neverTold;
  if (days === 0) return s.today;
  if (days === 1) return s.yesterday;
  return s.daysAgo(days);
}

function statusDot(status, s) {
  return `<span class="dot ${esc(status)}" role="img" aria-label="${esc(s.status[status] ?? '')}" title="${esc(s.status[status] ?? '')}"></span>`;
}

function reasonText(item, s) {
  if (item.reason === 'inactive') return s.reasonInactive(item.days);
  if (item.reason === 'never_told') return s.reasonNeverTold(item.days);
  return s.reasonStuck;
}

function kpi(value, label) {
  return `<div class="kpi"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
}

function renderAttention(data, s) {
  const items = data.attention.length
    ? data.attention
        .map((item) => `<li data-user-id="${esc(item.userId)}">${emailOf(item.email, s)}<span class="soft"> · ${esc(reasonText(item, s))}</span></li>`)
        .join('')
    : `<li class="soft">${esc(s.attentionNone)}</li>`;
  return `<section class="card alert"><h2>${esc(s.attentionTitle)}</h2><ul class="plain">${items}</ul></section>`;
}

function renderFunnel(data, s) {
  const f = data.funnel;
  const max = Math.max(f.registered, 1);
  const steps = [
    [s.funnelRegistered, f.registered],
    [s.funnelAddedBook, f.addedBook],
    [s.funnelToldFirst, f.toldFirstTime],
    [s.funnelPassedFirst, f.passedFirstCheck],
  ];
  const rows = steps
    .map(
      ([label, count]) =>
        `<div class="funnel-row"><div class="funnel-label"><span>${esc(label)}</span><b>${esc(count)}</b></div><div class="bar" style="inline-size:${Math.round((count / max) * 100)}%"></div></div>`
    )
    .join('');
  return `<section class="card"><h2>${esc(s.funnelTitle)}</h2>${rows}</section>`;
}

function renderApi(data, s) {
  if (!data.apiUsage.length) {
    return `<section class="card"><h2>${esc(s.apiTitle)}</h2><p class="soft">${esc(s.apiNone)}</p></section>`;
  }
  const ceiling = data.apiEstimatedDailyCeiling;
  const max = Math.max(ceiling, ...data.apiUsage.map((d) => d.calls), 1);
  const width = 600;
  const height = 120;
  const slot = width / data.apiUsage.length;
  const bars = data.apiUsage
    .map((d, i) => {
      const h = Math.max(2, Math.round((d.calls / max) * (height - 8)));
      const x = width - (i + 1) * slot + slot * 0.15;
      return `<rect x="${x.toFixed(1)}" y="${height - h}" width="${(slot * 0.7).toFixed(1)}" height="${h}" class="svg-bar"><title>${esc(formatDate(d.date))}: ${esc(d.calls)} ${esc(s.apiCalls)}</title></rect>`;
    })
    .join('');
  const lineY = height - Math.round((ceiling / max) * (height - 8));
  const first = data.apiUsage[0].date;
  const last = data.apiUsage[data.apiUsage.length - 1].date;
  return `<section class="card"><h2>${esc(s.apiTitle)}</h2>
<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="${esc(s.apiTitle)}">${bars}<line x1="0" x2="${width}" y1="${lineY}" y2="${lineY}" class="svg-line"/></svg>
<p class="soft small">${esc(formatDate(first))} עד ${esc(formatDate(last))} · ${esc(s.apiCeiling(ceiling))}</p></section>`;
}

function timeCell(t, data, s) {
  if (!data.timeTracking.available) return `<span class="soft">${esc(s.afterNextUpdate)}</span>`;
  return esc(s.timeCell(t.activeMinutes7d ?? 0, t.opens7d ?? 0));
}

function renderTesters(data, s) {
  if (!data.testers.length) {
    return `<section class="card"><h2>${esc(s.testersTitle)}</h2><p class="soft">${esc(s.testersNone)}</p></section>`;
  }
  const rows = data.testers
    .map((t) => {
      const last = t.lastEntryDate
        ? `${esc(formatDate(t.lastEntryDate))}<br><span class="soft small">${esc(t.lastEntryBook ?? '')}${t.lastEntryPages ? ` · ${esc(s.pages(t.lastEntryPages.from, t.lastEntryPages.to))}` : ''}</span>`
        : `<span class="soft">${esc(s.neverTold)}</span>`;
      const check = t.latestCheck ? esc(s.checkCell(t.latestCheck.score, t.latestCheck.attempts)) : `<span class="soft">${esc(s.checkNone)}</span>`;
      const owner = t.isOwner ? ` <span class="pill">${esc(s.ownerTag)}</span>` : '';
      return `<tr data-user-id="${esc(t.userId)}" tabindex="0">
<td>${statusDot(t.status, s)}${emailOf(t.email, s)}${owner}</td>
<td>${last}</td>
<td>${esc(sinceText(t.daysSince, s))}</td>
<td>${esc(s.streakDays(t.streak))}</td>
<td>${esc(s.booksCell(t.booksStarted, t.booksFinished))}</td>
<td>${check}</td>
<td>${timeCell(t, data, s)}</td>
</tr>`;
    })
    .join('');
  return `<section class="card"><h2>${esc(s.testersTitle)}</h2><div class="table-wrap"><table>
<thead><tr><th>${esc(s.colTester)}</th><th>${esc(s.colLastEntry)}</th><th>${esc(s.colSince)}</th><th>${esc(s.colStreak)}</th><th>${esc(s.colBooks)}</th><th>${esc(s.colCheck)}</th><th>${esc(s.colTime)}</th></tr></thead>
<tbody>${rows}</tbody></table></div></section>`;
}

export function renderOverview(data, s) {
  return `<p class="soft small">${esc(s.updatedAt)} ${esc(formatDateTime(data.generatedAt))}</p>
<div class="kpis">${kpi(data.totals.registered, s.kpiRegistered)}${kpi(data.totals.toldToday, s.kpiToldToday)}${kpi(data.totals.inactive3Plus, s.kpiInactive)}</div>
${renderAttention(data, s)}
${renderFunnel(data, s)}
${renderApi(data, s)}
${renderTesters(data, s)}`;
}

export function renderTesterDetail(data, s) {
  const history = data.history.length
    ? `<div class="table-wrap"><table><thead><tr><th>${esc(s.colDate)}</th><th>${esc(s.colBook)}</th><th>${esc(s.colPages)}</th></tr></thead><tbody>${data.history
        .map(
          (h) =>
            `<tr><td>${esc(formatDate(h.date))}</td><td>${esc(h.bookTitle)}</td><td>${esc(s.pages(h.pageFrom, h.pageTo))}</td></tr>`
        )
        .join('')}</tbody></table></div>`
    : `<p class="soft">${esc(s.detailHistoryNone)}</p>`;

  const last = data.lastEntry
    ? `<section class="card"><h2>${esc(s.detailLastEntry)}</h2>
<p class="soft small">${esc(formatDate(data.lastEntry.date))} · ${esc(data.lastEntry.bookTitle)} · ${esc(s.pages(data.lastEntry.pageFrom, data.lastEntry.pageTo))}</p>
<h3>${esc(s.detailSaid)}</h3>
<p class="said">${data.lastEntry.text ? esc(data.lastEntry.text) : `<span class="soft">${esc(s.detailNoText)}</span>`}</p></section>`
    : '';

  return `<button type="button" class="link" data-action="back">${esc(s.detailBack)}</button>
<h2>${emailOf(data.email, s)}</h2>
${last}
<section class="card"><h2>${esc(s.detailHistory)}</h2>${history}</section>`;
}
