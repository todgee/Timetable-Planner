/* ==========================================================
   PORTAL.JS — timetable dashboard, Supabase-backed
   ========================================================== */

// ── Greeting ──────────────────────────────────────────────

const hour     = new Date().getHours();
const timePart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
document.getElementById('portal-greeting').textContent = `Good ${timePart}`;

// ── Init ──────────────────────────────────────────────────

async function initPortal() {
  await window.authReady;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  document.body.style.visibility = 'visible';

  const { data: timetables, error } = await supabase
    .from('timetables')
    .select('id, name, description, setup_complete, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load timetables:', error.message);
    renderGrid([]);
    return;
  }

  renderGrid(timetables || []);
}

// ── Render timetable grid ─────────────────────────────────

function renderGrid(timetables) {
  const grid = document.getElementById('grid-owned');
  if (!grid) return;

  if (timetables.length === 0) {
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

  grid.innerHTML = timetables.map(tt => buildCard(tt)).join('');
}

function buildCard(tt) {
  const descHtml = tt.description
    ? `<p class="card-desc">${escapeHtml(tt.description)}</p>`
    : '';
  const dateHtml = tt.updated_at
    ? `<span class="card-date">Updated ${formatDate(tt.updated_at)}</span>`
    : '';
  const href = tt.setup_complete
    ? `admin.html?id=${tt.id}`
    : `setup.html?id=${tt.id}`;
  const label = tt.setup_complete ? 'Open' : 'Continue setup';

  return `
    <div class="timetable-card">
      <div class="card-top">
        <div class="card-header-row">
          <h3 class="card-name">${escapeHtml(tt.name)}</h3>
        </div>
        ${descHtml}
      </div>
      <div class="card-footer">
        ${dateHtml}
        <a class="btn btn-sm btn-primary" href="${href}">${label}</a>
      </div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
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

modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

btnConfirm.addEventListener('click', async () => {
  const name        = inputName.value.trim();
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

  btnConfirm.disabled = true;
  btnConfirm.classList.add('loading');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: tt, error } = await supabase
      .from('timetables')
      .insert({ owner_id: user.id, name, description })
      .select('id')
      .single();

    if (error) throw error;

    window.location.href = `setup.html?id=${tt.id}`;
  } catch (err) {
    console.error('Create timetable failed:', err);
    createError.textContent = 'Something went wrong. Please try again.';
    createError.classList.add('visible');
    btnConfirm.disabled = false;
    btnConfirm.classList.remove('loading');
  }
});

// ── Start ─────────────────────────────────────────────────

initPortal();
