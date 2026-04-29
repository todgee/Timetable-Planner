/* ==========================================================
   PORTAL.JS
   ========================================================== */

let currentUser = null;

// ── Greeting (time portion — no network needed) ───────────

const hour = new Date().getHours();
const timePart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
document.getElementById('portal-greeting').textContent = `Good ${timePart}`;

// ── Data loading ──────────────────────────────────────────

async function initPortal() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // require-auth.js handles the redirect
  currentUser = user;

  const [profileResult, ownedResult, sharedResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('timetables')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false }),

    supabase
      .from('timetable_members')
      .select('role, timetables(*)')
      .eq('user_id', user.id),
  ]);

  // If no profile row exists (trigger may not have run at signup), create one now.
  // timetables.owner_id is a FK to profiles.id — the insert will 403 without this row.
  let profile = profileResult.data;
  if (!profile) {
    const meta = user.user_metadata || {};
    const { data: created } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: meta.first_name || null,
        last_name:  meta.last_name  || null,
        full_name:  meta.full_name  || null,
        organisation: meta.organisation || null,
        role: meta.role || null,
      })
      .select('first_name, last_name, full_name, avatar_url')
      .maybeSingle();
    profile = created;
  }

  renderHeader(user, profile);
  renderGreeting(profile);
  renderOwned(ownedResult.data || []);
  renderShared(sharedResult.data || []);
}

// ── Header ────────────────────────────────────────────────

function renderHeader(user, profile) {
  const displayName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user.email;

  document.getElementById('user-name').textContent = displayName;
  document.getElementById('user-avatar').textContent = getInitials(profile, user.email);
}

function getInitials(profile, email) {
  if (profile?.first_name && profile?.last_name) {
    return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  }
  if (profile?.full_name) {
    const parts = profile.full_name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function renderGreeting(profile) {
  const firstName =
    profile?.first_name ||
    profile?.full_name?.split(/\s+/)[0] ||
    null;

  const greeting = firstName
    ? `Good ${timePart}, ${firstName}`
    : `Good ${timePart}`;

  document.getElementById('portal-greeting').textContent = greeting;
}

// ── Timetable sections ────────────────────────────────────

function renderOwned(timetables) {
  renderGrid('grid-owned', timetables, 'owner');
}

function renderShared(members) {
  const timetables = members
    .filter(m => m.timetables)
    .map(m => ({ ...m.timetables, role: m.role }))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  if (timetables.length === 0) return; // keep section hidden

  renderGrid('grid-shared', timetables, null);
  document.getElementById('section-shared').hidden = false;
}

function renderGrid(gridId, timetables, defaultRole) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (timetables.length === 0) {
    const isOwned = gridId === 'grid-owned';
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
        <p class="empty-title">${isOwned ? 'No timetables yet' : 'Nothing shared with you yet'}</p>
        <p class="empty-desc">${isOwned ? 'Create your first timetable to get started.' : 'When someone adds you to their timetable, it will appear here.'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = timetables.map(tt => buildCard(tt, defaultRole)).join('');
}

function buildCard(tt, defaultRole) {
  const role = tt.role || defaultRole || 'owner';
  const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Viewer';
  const roleMod = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : 'viewer';
  const descHtml = tt.description
    ? `<p class="card-desc">${escapeHtml(tt.description)}</p>`
    : '';

  return `
    <div class="timetable-card">
      <div class="card-top">
        <div class="card-header-row">
          <h3 class="card-name">${escapeHtml(tt.name)}</h3>
          <span class="role-badge role-badge--${roleMod}">${roleLabel}</span>
        </div>
        ${descHtml}
      </div>
      <div class="card-footer">
        <span class="card-date">Updated ${formatDate(tt.updated_at)}</span>
        <a class="btn btn-sm btn-primary" href="admin.html?id=${tt.id}">Open</a>
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

const modal         = document.getElementById('modal-create');
const inputName     = document.getElementById('input-tt-name');
const inputDesc     = document.getElementById('input-tt-desc');
const errorName     = document.getElementById('error-tt-name');
const createError   = document.getElementById('create-error');
const btnConfirm    = document.getElementById('btn-modal-confirm');

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

btnConfirm.addEventListener('click', async () => {
  const name = inputName.value.trim();
  const description = inputDesc.value.trim() || null;

  // Validate
  if (!name) {
    errorName.textContent = 'Please enter a name for the timetable.';
    inputName.classList.add('invalid');
    inputName.focus();
    return;
  }
  errorName.textContent = '';
  inputName.classList.remove('invalid');
  createError.classList.remove('visible');

  // Resolve user ID — currentUser may not be set yet if initPortal() is still in flight
  const userId = currentUser?.id ?? (await supabase.auth.getSession()).data.session?.user?.id;
  if (!userId) {
    createError.textContent = 'Session error. Please refresh and try again.';
    createError.classList.add('visible');
    return;
  }

  btnConfirm.disabled = true;
  btnConfirm.classList.add('loading');

  try {
    console.log('insert payload:', { owner_id: userId, name, description });
    const { data, error } = await supabase
      .from('timetables')
      .insert({ owner_id: userId, name, description })
      .select('id')
      .single();

    if (error) throw error;

    window.location.href = `setup.html?id=${data.id}`;
  } catch (err) {
    console.error('Create timetable failed:', err);
    btnConfirm.disabled = false;
    btnConfirm.classList.remove('loading');
    createError.textContent = 'Something went wrong. Please try again.';
    createError.classList.add('visible');
  }
});

// ── Sign out ──────────────────────────────────────────────

document.getElementById('btn-signout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace('auth.html');
});

// ── Init ──────────────────────────────────────────────────

initPortal();
