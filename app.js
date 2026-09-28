(() => {
  const feedEl = document.getElementById('feed');
  const sentinel = document.getElementById('sentinel');
  const statusEl = document.getElementById('status');
  const sheet = document.getElementById('sheet');
  const sheetBody = document.getElementById('sheet-body');
  const filters = document.getElementById('filters');

  const DATA = window.RADAR_FEED;
  if (!DATA || !DATA.days) {
    statusEl.hidden = false;
    statusEl.textContent = '数据未加载';
    return;
  }

  let filter = 'all';
  let nextDayIndex = 0;
  const INITIAL_DAYS = 2;
  const teardownCache = new Map();

  function filteredDays() {
    if (filter === 'all') return DATA.days;
    return DATA.days
      .map((d) => ({
        ...d,
        items: d.items.filter((it) => it.category === filter),
      }))
      .filter((d) => d.items.length > 0);
  }

  function cardHTML(item) {
    const hi = item.highlight
      ? `<span class="hi-badge">今日最炫</span>`
      : '';
    const attrs = item.highlight
      ? `href="#" role="button" data-highlight="${item.id}" class="card is-hi"`
      : `href="${item.url}" target="_blank" rel="noopener" class="card"`;
    return `
      <a ${attrs}>
        <img class="card-thumb" src="${item.thumb}" alt="" loading="lazy" decoding="async" width="800" height="500" />
        <div class="card-body">
          <div class="card-row">
            ${hi}
            <span class="tag" data-type="${item.category}">${item.category}</span>
          </div>
          <div class="card-title">${escapeHtml(item.title)}</div>
          <div class="card-desc">${escapeHtml(item.desc)}</div>
        </div>
      </a>`;
  }

  function dayHTML(day) {
    return `
      <section class="day" data-date="${day.date}">
        <div class="day-head">
          ${day.permalink
            ? `<a class="day-date day-link" href="${day.permalink}">${day.label}<span class="day-go">单日页 ›</span></a>`
            : `<div class="day-date">${day.label}</div>`}
          <div class="day-count">${day.items.length} 条</div>
        </div>
        ${day.items.map(cardHTML).join('')}
      </section>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resetAndRender() {
    feedEl.innerHTML = '';
    nextDayIndex = 0;
    appendDays(INITIAL_DAYS);
    statusEl.hidden = true;
  }

  function appendDays(n) {
    const days = filteredDays();
    if (nextDayIndex >= days.length) {
      statusEl.hidden = false;
      statusEl.textContent = days.length ? '— 已经到底了 —' : '这一类暂时没有条目';
      return false;
    }
    const slice = days.slice(nextDayIndex, nextDayIndex + n);
    nextDayIndex += slice.length;
    const html = slice.map(dayHTML).join('');
    feedEl.insertAdjacentHTML('beforeend', html);
    if (nextDayIndex >= days.length) {
      statusEl.hidden = false;
      statusEl.textContent = '— 已经到底了 —';
    }
    return true;
  }

  let loadingMore = false;
  const io = new IntersectionObserver(
    async (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || loadingMore) continue;
        loadingMore = true;
        // keep appending while near bottom
        let guard = 0;
        while (guard < 4) {
          const near = await new Promise((resolve) => {
            // check if sentinel still near viewport
            const rect = sentinel.getBoundingClientRect();
            resolve(rect.top < window.innerHeight + 800);
          });
          if (!near) break;
          const ok = appendDays(2);
          if (!ok) break;
          guard += 1;
          await new Promise((r) => setTimeout(r, 40));
        }
        loadingMore = false;
      }
    },
    { rootMargin: '800px 0px' }
  );
  io.observe(sentinel);

  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    filters.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    filter = btn.dataset.filter;
    resetAndRender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  feedEl.addEventListener('click', async (e) => {
    const a = e.target.closest('a[data-highlight]');
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.highlight;
    const item = DATA.days.flatMap((d) => d.items).find((it) => it.id === id);
    if (!item) return;
    await openSheet(item);
  });

  async function openSheet(item) {
    let teardownHtml = '';
    if (item.teardown) {
      if (teardownCache.has(item.teardown)) {
        teardownHtml = teardownCache.get(item.teardown);
      } else {
        try {
          const res = await fetch(item.teardown);
          teardownHtml = await res.text();
          teardownCache.set(item.teardown, teardownHtml);
        } catch (err) {
          teardownHtml = '<p>拆解加载失败。</p>';
        }
      }
    }
    sheetBody.innerHTML = `
      <div class="sheet-kicker">今日最炫 · 拆解</div>
      <h2 class="sheet-title">${escapeHtml(item.title)}</h2>
      <p class="sheet-desc">${escapeHtml(item.desc)}</p>
      <img class="sheet-hero" src="${item.thumb}" alt="" />
      <a class="btn-open" href="${item.url}" target="_blank" rel="noopener">打开网站</a>
      ${item.permalink ? `<a class="btn-ghost" href="${item.permalink}">当天单页（可转发）›</a>` : ''}
      <div class="teardown">${teardownHtml}</div>
    `;
    sheet.hidden = false;
    document.body.classList.add('sheet-open');
  }

  function closeSheet() {
    sheet.hidden = true;
    document.body.classList.remove('sheet-open');
    sheetBody.innerHTML = '';
  }

  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeSheet();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  resetAndRender();
})();
