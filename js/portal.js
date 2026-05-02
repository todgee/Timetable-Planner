/* ==========================================================
   PORTAL.JS — timetable dashboard, Supabase-backed
   ========================================================== */

// ── Initial greeting (no name yet — updated after auth) ───

(function () {
  const h    = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const el   = document.getElementById('portal-greeting');
  if (el) el.textContent = 'Good ' + part;
}());

// ── Init ──────────────────────────────────────────────────

async function initPortal() {
  await window.authReady;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // ── Onboarding: redirect new users to personalise their workspace ──
  const { data: ucfg } = await supabase
    .from('user_config')
    .select('setup_complete')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ucfg || !ucfg.setup_complete) {
    window.location.replace('config.html');
    return;
  }

  document.body.style.visibility = 'visible';

  // ── Header user info ──────────────────────────────────────
  const meta        = user.user_metadata || {};
  const displayName = meta.full_name || meta.first_name || user.email;
  const initial     = (meta.first_name || user.email || '?')[0].toUpperCase();
  const nameEl      = document.getElementById('user-name');
  const avatarEl    = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent   = displayName;
  if (avatarEl) avatarEl.textContent = initial;

  // ── Personalise greeting with first name ─────────────────
  const firstName = meta.first_name
    || (meta.full_name ? meta.full_name.split(' ')[0] : null);
  if (firstName) {
    const h    = new Date().getHours();
    const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const greetEl = document.getElementById('portal-greeting');
    if (greetEl) greetEl.textContent = `Good ${part}, ${firstName}`;
  }

  document.getElementById('btn-signout').addEventListener('click', window.signOut);

  // ── Load timetables ───────────────────────────────────────
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

  // Update welcome subtitle and nav count badge
  const count   = timetables.length;
  const subEl   = document.getElementById('portal-sub');
  const countEl = document.getElementById('tt-count');
  if (subEl) {
    subEl.textContent = count === 1 ? '1 timetable'
                      : count  > 1 ? `${count} timetables`
                      : '';
  }
  if (countEl && count > 0) countEl.textContent = count;

  if (count === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <p class="empty-title">No timetables yet</p>
        <p class="empty-desc">Hit <strong>New Timetable</strong> above to create your first one.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = timetables.map(tt => buildCard(tt)).join('');
}

function buildCard(tt) {
  const isComplete = tt.setup_complete;
  const href       = isComplete ? `admin.html?id=${tt.id}` : `setup.html?id=${tt.id}`;
  const descHtml   = tt.description
    ? `<p class="card-desc">${escapeHtml(tt.description)}</p>`
    : '';
  const dateText = tt.updated_at ? `Updated ${formatDate(tt.updated_at)}` : '';

  return `
    <div class="timetable-card${isComplete ? '' : ' timetable-card--setup'}">
      <div class="card-body">
        <div class="card-header-row">
          <h3 class="card-name">${escapeHtml(tt.name)}</h3>
          <span class="status-badge ${isComplete ? 'status-badge--active' : 'status-badge--setup'}">
            ${isComplete ? 'Active' : 'In setup'}
          </span>
        </div>
        ${descHtml}
      </div>
      <div class="card-footer">
        <span class="card-date">${dateText}</span>
        <a class="btn btn-sm ${isComplete ? 'btn-primary' : 'btn-ghost'}" href="${href}">
          ${isComplete ? 'Open' : 'Continue'}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
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
