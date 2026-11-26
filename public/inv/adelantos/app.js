const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const nf = new Intl.NumberFormat('es-AR');
const df = new Intl.DateTimeFormat('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });

const state = {
  claims: [],
  filtered: [],
  summary: null,
  page: 1,
  pageSize: 25,
};

const fields = {
  search: $('#searchInput'),
  year: $('#yearFilter'),
  category: $('#categoryFilter'),
  product: $('#productFilter'),
  outcome: $('#outcomeFilter'),
  relevance: $('#relevanceFilter'),
  sort: $('#sortFilter'),
  club: $('#clubOnly'),
  policy: $('#policyOnly'),
  company: $('#companyOnly'),
};

const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.valueOf()) ? value : df.format(date);
};

const allCategories = (claim) => [claim.categoria_principal, ...(claim.categorias_secundarias || '').split('|')]
  .map((x) => x.trim()).filter(Boolean);

const clubCategories = new Set([
  'Suscripción no consentida al Club Adelantos',
  'Contratación obligatoria del Club Adelantos para acceder al préstamo',
  'Imposibilidad de cancelar la suscripción mientras exista deuda',
  'Posible ocultamiento del costo financiero total',
]);

const isClubClaim = (claim) => allCategories(claim).some((category) => clubCategories.has(category));

function buildSearchIndex(claim) {
  return normalize([
    claim.titulo,
    claim.descripcion_completa,
    claim.respuestas_empresa_completas,
    claim.intervenciones_consumidor,
    claim.categoria_principal,
    claim.categorias_secundarias,
    claim.estado_reclamo,
    claim.posibles_infracciones,
  ].join(' '));
}

function fillSelect(select, values) {
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
  select.insertAdjacentHTML('beforeend', options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(''));
}

function renderYearChart() {
  const data = state.summary.yearly;
  const width = 900;
  const height = 330;
  const pad = { left: 48, right: 24, top: 25, bottom: 45 };
  const max = Math.max(...data.map((d) => d.reclamos));
  const x = (i) => pad.left + i * ((width - pad.left - pad.right) / (data.length - 1));
  const y = (v) => height - pad.bottom - (v / max) * (height - pad.top - pad.bottom);
  const points = data.map((d, i) => `${x(i)},${y(d.reclamos)}`).join(' ');
  const area = `${pad.left},${height - pad.bottom} ${points} ${x(data.length - 1)},${height - pad.bottom}`;
  const grid = [0, .25, .5, .75, 1].map((p) => {
    const gy = height - pad.bottom - p * (height - pad.top - pad.bottom);
    return `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" stroke="#e5e7eb" stroke-width="1"/><text x="${pad.left - 9}" y="${gy + 4}" text-anchor="end" fill="#74787d" font-size="12">${nf.format(Math.round(max * p))}</text>`;
  }).join('');
  const labels = data.map((d, i) => `<text x="${x(i)}" y="${height - 15}" text-anchor="middle" fill="#666b70" font-size="12">${d.anio}</text>`).join('');
  const dots = data.map((d, i) => `<g><circle cx="${x(i)}" cy="${y(d.reclamos)}" r="5" fill="#e6007e" stroke="#fff" stroke-width="3"><title>${d.anio}: ${nf.format(d.reclamos)} reclamos</title></circle><text x="${x(i)}" y="${y(d.reclamos)-12}" text-anchor="middle" fill="#2b2b2b" font-size="12" font-weight="700">${nf.format(d.reclamos)}</text></g>`).join('');
  $('#yearChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución anual de reclamos">${grid}<polygon points="${area}" fill="rgba(0,102,179,.10)"/><polyline points="${points}" fill="none" stroke="#0066b3" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}</svg>`;
}

function renderCategoryChart() {
  const data = state.summary.categories.slice(0, 10);
  const max = data[0].reclamos;
  $('#categoryChart').innerHTML = data.map((item) => `
    <div class="bar-item">
      <span class="bar-label">${escapeHtml(item.categoria)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(item.reclamos / max * 100).toFixed(1)}%"></span></span>
      <span class="bar-value">${nf.format(item.reclamos)}</span>
    </div>`).join('');
}

function currentFilters() {
  return {
    q: normalize(fields.search.value.trim()),
    year: fields.year.value,
    category: fields.category.value,
    product: fields.product.value,
    outcome: fields.outcome.value,
    relevance: fields.relevance.value,
    club: fields.club.checked,
    policy: fields.policy.checked,
    company: fields.company.checked,
  };
}

function applyFilters(resetPage = true) {
  const f = currentFilters();
  let result = state.claims.filter((claim) => {
    if (f.q && !claim._search.includes(f.q)) return false;
    if (f.year && !claim.fecha_publicacion.startsWith(f.year)) return false;
    if (f.category && !allCategories(claim).includes(f.category)) return false;
    if (f.product && claim.producto_servicio !== f.product) return false;
    if (f.outcome && claim.conformidad_consumidor !== f.outcome) return false;
    if (f.relevance && claim.relevancia_probatoria !== f.relevance) return false;
    if (f.club && !isClubClaim(claim)) return false;
    if (f.policy && claim.politica_comercial_reconocida !== 'sí') return false;
    if (f.company && Number(claim.cantidad_respuestas_empresa || 0) < 1) return false;
    return true;
  });
  const sort = fields.sort.value;
  result.sort((a, b) => {
    if (sort === 'date-asc') return a.fecha_publicacion.localeCompare(b.fecha_publicacion);
    if (sort === 'responses-desc') return Number(b.cantidad_respuestas_empresa || 0) - Number(a.cantidad_respuestas_empresa || 0) || b.fecha_publicacion.localeCompare(a.fecha_publicacion);
    return b.fecha_publicacion.localeCompare(a.fecha_publicacion);
  });
  state.filtered = result;
  if (resetPage) state.page = 1;
  renderResults();
  renderActiveFilters(f);
}

function resultStatusClass(value = '') {
  const n = normalize(value);
  if (n.includes('disconformidad')) return 'negative';
  if (n.includes('conformidad')) return 'positive';
  return '';
}

function renderResults() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  const visible = state.filtered.slice(start, start + state.pageSize);
  $('#resultCount').textContent = nf.format(state.filtered.length);
  $('#claimsBody').innerHTML = visible.map((claim) => `
    <tr>
      <td>${escapeHtml(formatDate(claim.fecha_publicacion))}</td>
      <td><span class="claim-title">${escapeHtml(claim.titulo)}</span><span class="claim-id">ID ${escapeHtml(claim.identificador)}</span></td>
      <td>${escapeHtml(claim.categoria_principal || 'Sin clasificar')}</td>
      <td><span class="status-pill ${resultStatusClass(claim.conformidad_consumidor)}">${escapeHtml(claim.conformidad_consumidor || 'Sin manifestación')}</span></td>
      <td><span class="company-count" title="Cantidad de respuestas empresariales">${nf.format(Number(claim.cantidad_respuestas_empresa || 0))}</span></td>
      <td><button class="open-detail" data-id="${escapeHtml(claim.identificador)}">Ver ficha</button></td>
    </tr>`).join('');
  $('#emptyState').hidden = visible.length > 0;
  $('#pageInfo').textContent = `Página ${state.page} de ${totalPages}`;
  $('#prevPage').disabled = state.page <= 1;
  $('#nextPage').disabled = state.page >= totalPages;
}

function renderActiveFilters(f) {
  const labels = [];
  if (fields.search.value.trim()) labels.push(`Texto: ${fields.search.value.trim()}`);
  if (f.year) labels.push(`Año: ${f.year}`);
  if (f.category) labels.push(f.category);
  if (f.product) labels.push(f.product);
  if (f.outcome) labels.push(f.outcome);
  if (f.relevance) labels.push(`Relevancia ${f.relevance}`);
  if (f.club) labels.push('Club Adelantos');
  if (f.policy) labels.push('Política reconocida');
  if (f.company) labels.push('Con respuesta empresarial');
  $('#activeFilters').innerHTML = labels.map((label) => `<span class="filter-chip">${escapeHtml(label)}</span>`).join('');
}

function textSection(title, text) {
  if (!text) return '';
  return `<section class="detail-section"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></section>`;
}

function showDetail(id) {
  const claim = state.claims.find((item) => String(item.identificador) === String(id));
  if (!claim) return;
  const categories = allCategories(claim);
  $('#detailContent').innerHTML = `
    <header class="detail-header">
      <p class="eyebrow">Reclamo ID ${escapeHtml(claim.identificador)}</p>
      <h2>${escapeHtml(claim.titulo)}</h2>
      <div class="detail-meta">
        <span>${escapeHtml(formatDate(claim.fecha_publicacion))}</span>
        <span>${escapeHtml(claim.producto_servicio || 'Producto no precisado')}</span>
        <span>Relevancia ${escapeHtml(claim.relevancia_probatoria || 'sin clasificar')}</span>
        ${claim.politica_comercial_reconocida === 'sí' ? '<span>Indicio de política general</span>' : ''}
      </div>
    </header>
    <div class="detail-grid">
      <div><small>Categoría principal</small><strong>${escapeHtml(claim.categoria_principal || 'Sin clasificar')}</strong></div>
      <div><small>Resultado</small><strong>${escapeHtml(claim.conformidad_consumidor || 'Sin manifestación')}</strong></div>
      <div><small>Respuestas empresariales</small><strong>${nf.format(Number(claim.cantidad_respuestas_empresa || 0))}</strong></div>
      <div><small>Estado del portal</small><strong>${escapeHtml(claim.estado_en_listado || claim.estado_reclamo || 'No informado')}</strong></div>
    </div>
    ${categories.length > 1 ? textSection('Categorías relacionadas', categories.slice(1).join(' · ')) : ''}
    ${textSection('Relato publicado', claim.descripcion_completa)}
    ${textSection('Respuesta(s) atribuida(s) a la empresa', claim.respuestas_empresa_completas)}
    ${textSection('Intervenciones del consumidor', claim.intervenciones_consumidor)}
    ${textSection('Eventos del reclamo', claim.eventos_del_reclamo)}
    ${textSection('Montos mencionados', [claim.monto_capital_mencionado && `Capital: ${claim.monto_capital_mencionado}`, claim.monto_cuota_mencionado && `Cuota: ${claim.monto_cuota_mencionado}`, claim.importe_suscripcion_mencionado && `Suscripción: ${claim.importe_suscripcion_mencionado}`, claim.total_reclamado_mencionado && `Total: ${claim.total_reclamado_mencionado}`, claim.otros_montos_mencionados].filter(Boolean).join('\n'))}
    ${textSection('Posibles encuadres para revisar', claim.posibles_infracciones)}
    ${textSection('Observaciones de extracción', claim.observaciones)}
    <section class="detail-section"><a class="source-link" href="${escapeHtml(claim.url)}" target="_blank" rel="noopener noreferrer">Abrir publicación original</a></section>`;
  $('#detailDialog').showModal();
}

function clearFilters() {
  fields.search.value = '';
  [fields.year, fields.category, fields.product, fields.outcome, fields.relevance].forEach((el) => el.value = '');
  fields.sort.value = 'date-desc';
  [fields.club, fields.policy, fields.company].forEach((el) => el.checked = false);
  applyFilters();
}

function bindEvents() {
  let timer;
  fields.search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => applyFilters(), 180);
  });
  Object.values(fields).filter((el) => el !== fields.search).forEach((el) => el.addEventListener('change', () => applyFilters()));
  $('#clearFilters').addEventListener('click', clearFilters);
  $('#prevPage').addEventListener('click', () => { state.page -= 1; renderResults(); $('#explorador').scrollIntoView({ behavior: 'smooth' }); });
  $('#nextPage').addEventListener('click', () => { state.page += 1; renderResults(); $('#explorador').scrollIntoView({ behavior: 'smooth' }); });
  $('#claimsBody').addEventListener('click', (event) => {
    const button = event.target.closest('.open-detail');
    if (button) showDetail(button.dataset.id);
  });
  $('#dialogClose').addEventListener('click', () => $('#detailDialog').close());
  $('#detailDialog').addEventListener('click', (event) => {
    if (event.target === $('#detailDialog')) $('#detailDialog').close();
  });
  $$('[data-preset="club-policy"]').forEach((button) => button.addEventListener('click', () => {
    clearFilters();
    fields.club.checked = true;
    fields.policy.checked = true;
    applyFilters();
    $('#explorador').scrollIntoView({ behavior: 'smooth' });
  }));
}

async function init() {
  try {
    const [claimsResponse, summaryResponse] = await Promise.all([
      fetch('/inv/adelantos/data/claims.json'),
      fetch('/inv/adelantos/data/summary.json'),
    ]);
    if (!claimsResponse.ok || !summaryResponse.ok) throw new Error('No se pudo cargar la base.');
    const [claims, summary] = await Promise.all([claimsResponse.json(), summaryResponse.json()]);
    state.summary = summary;
    state.claims = claims.map((claim) => ({ ...claim, _search: buildSearchIndex(claim) }));
    state.filtered = [...state.claims];
    fillSelect(fields.year, summary.yearly.map((x) => x.anio).sort().reverse());
    fillSelect(fields.category, state.claims.flatMap(allCategories));
    fillSelect(fields.product, state.claims.map((x) => x.producto_servicio));
    renderYearChart();
    renderCategoryChart();
    bindEvents();
    applyFilters(false);
  } catch (error) {
    $('#loadingScreen').innerHTML = `<div class="loading-mark">!</div><p>${escapeHtml(error.message)}</p>`;
    return;
  }
  requestAnimationFrame(() => $('#loadingScreen').classList.add('hidden'));
}

init();
