/* ==========================================================
   PORTAL.JS — localStorage-backed timetable dashboard
   ========================================================== */

// ── Greeting ──────────────────────────────────────────────

const hour = new Date().getHours();
const timePart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
document.getElementById('portal-greeting').textContent = `Good ${timePart}`;

// ── Data loading ──────────────────────────────────────────

function initPortal() {
  const data = loadTimetable();
  renderOwned(data);
}

// ── Timetable section ─────────────────────────────────────

function renderOwned(data) {
  const grid = document.getElementById('grid-owned');
  if (!grid) return;

  if (!data || !data.setupComplete) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <p class="empty-title">No timetables yet</p>
        <p class="empty-desc">Create your first timetable to get started.</p>
      </div>
    `;
    return;
  }

  const updatedAt = data.updatedAt ? formatDate(data.updatedAt) : null;
  const descHtml = data.description
    ? `<p class="card-desc">${escapeHtml(data.description)}</p>`
    : '';

  grid.innerHTML = `
    <div class="timetable-card">
      <div class="card-top">
        <div class="card-header-row">
          <h3 class="card-name">${escapeHtml(data.name || 'My Timetable')}</h3>
        </div>
        ${descHtml}
      </div>
      <div class="card-footer">
        ${updatedAt ? `<span class="card-date">Updated ${updatedAt}</span>` : ''}
        <a class="btn btn-sm btn-primary" href="admin.html">Open</a>
      </div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

// ── Create Timetable Modal ────────────────────────────────

const modal       = document.getElementById('modal-create');
const inputName   = document.getElementById('input-tt-name');
const inputDesc   = document.getElementById('input-tt-desc');
const errorName   = document.getElementById('error-tt-name');
const createError = document.getElementById('create-error');
const btnConfirm  = document.getElementById('btn-modal-confirm');

function openModal() {
  inputName.value = '';
  inputDesc.value = '';
  errorName.textContent = '';
  inputName.classList.remove('invalid');
  createError.textContent = '';
  createError.classList.remove('visible');
  modal.hidden = false;
  inputName.focus();
}

function closeModal() {
  modal.hidden = true;
}

document.getElementById('btn-create').addEventListener('click', openModal);
document.getElementById('btn-modal-close').addEventListener('click', closeModal);
document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);

modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

btnConfirm.addEventListener('click', () => {
  const name = inputName.value.trim();
  const description = inputDesc.value.trim() || null;

  if (!name) {
    errorName.textContent = 'Please enter a name for the timetable.';
    inputName.classList.add('invalid');
    inputName.focus();
    return;
  }
  errorName.textContent = '';
  inputName.classList.remove('invalid');
  createError.classList.remove('visible');

  saveTimetable({
    name,
    description,
    setupComplete: false,
    peopleList: [],
    classList: [],
    classColors: {},
    assignments: { monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {} },
    timeSlots: [],
  });

  window.location.href = 'setup.html';
});

// ── Init ──────────────────────────────────────────────────

initPortal();
