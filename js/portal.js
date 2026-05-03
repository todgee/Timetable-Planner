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
  loadSharedTimetables(user.id);
  loadMyInvites();
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

  // Members icon button only shown for completed timetables
  const membersBtn = isComplete ? `
    <button class="btn-card-members" data-tt-id="${tt.id}" data-tt-name="${escapeHtml(tt.name)}"
            title="Invite &amp; Members" aria-label="Invite &amp; Members">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    </button>` : '';

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
        <div class="card-footer-actions">
          ${membersBtn}
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
  if (e.key === 'Escape') {
    if (!modal.hidden)        closeModal();
    if (!membersModal.hidden) closeMembersModal();
  }
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

// ── Members / Invites Modal ───────────────────────────────

const membersModal      = document.getElementById('modal-members');
const membersModalTitle = document.getElementById('members-modal-title');
const inputInviteEmail  = document.getElementById('input-invite-email');
const membersInviteErr  = document.getElementById('members-invite-error');
const btnSendInvite     = document.getElementById('btn-send-invite');

let activeTtId   = null;
let activeTtName = null;

function openMembersModal(ttId, ttName) {
  activeTtId   = ttId;
  activeTtName = ttName;
  membersModalTitle.textContent = `Members — ${ttName}`;
  inputInviteEmail.value = '';
  membersInviteErr.textContent = '';
  membersInviteErr.classList.remove('visible');
  membersModal.hidden = false;
  loadMembersPanel(ttId);
  inputInviteEmail.focus();
}

function closeMembersModal() {
  membersModal.hidden = true;
  activeTtId   = null;
  activeTtName = null;
}

document.getElementById('btn-members-close').addEventListener('click', closeMembersModal);
membersModal.addEventListener('click', e => { if (e.target === membersModal) closeMembersModal(); });

// Event delegation: open members modal when a card's members button is clicked
document.getElementById('grid-owned').addEventListener('click', e => {
  const btn = e.target.closest('.btn-card-members');
  if (!btn) return;
  openMembersModal(btn.dataset.ttId, btn.dataset.ttName);
});

// ── Load panel data ───────────────────────────────────────

async function loadMembersPanel(ttId) {
  renderPendingInvites(null);  // show loading state
  renderMembers(null);

  const [{ data: invites, error: invErr }, { data: members, error: memErr }] =
    await Promise.all([
      supabase
        .from('timetable_invites')
        .select('id, invited_email, expires_at, status, created_at')
        .eq('timetable_id', ttId)
        .in('status', ['pending'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('timetable_members')
        .select('id, user_id, joined_at')
        .eq('timetable_id', ttId)
        .order('joined_at', { ascending: true }),
    ]);

  if (invErr) console.error('Failed to load invites:', invErr.message);
  if (memErr) console.error('Failed to load members:', memErr.message);

  renderPendingInvites(invites || []);
  renderMembers(members || []);
}

function renderPendingInvites(invites) {
  const list = document.getElementById('list-pending-invites');
  if (!invites) { list.innerHTML = '<li class="members-empty">Loading…</li>'; return; }
  if (invites.length === 0) {
    list.innerHTML = '<li class="members-empty">No pending invites.</li>';
    return;
  }
  list.innerHTML = invites.map(inv => {
    const exp = new Date(inv.expires_at).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short',
    });
    return `
      <li class="members-item">
        <span class="members-item-email">${escapeHtml(inv.invited_email)}</span>
        <span class="members-item-meta">Expires ${exp}</span>
        <button class="btn-members-action" data-action="revoke" data-invite-id="${inv.id}">
          Revoke
        </button>
      </li>`;
  }).join('');
}

function renderMembers(members) {
  const list = document.getElementById('list-members');
  if (!members) { list.innerHTML = '<li class="members-empty">Loading…</li>'; return; }
  if (members.length === 0) {
    list.innerHTML = '<li class="members-empty">No members yet.</li>';
    return;
  }
  list.innerHTML = members.map(m => {
    const joined = new Date(m.joined_at).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return `
      <li class="members-item">
        <span class="members-item-email members-item-uid">${m.user_id}</span>
        <span class="members-item-meta">Joined ${joined}</span>
        <button class="btn-members-action" data-action="remove" data-member-id="${m.id}">
          Remove
        </button>
      </li>`;
  }).join('');
}

// ── Actions (revoke / remove) via event delegation ────────

membersModal.addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn || !activeTtId) return;

  const action = btn.dataset.action;
  btn.disabled = true;

  if (action === 'revoke') {
    const { error } = await supabase
      .from('timetable_invites')
      .update({ status: 'revoked' })
      .eq('id', btn.dataset.inviteId);
    if (error) { console.error('Revoke failed:', error.message); btn.disabled = false; return; }
    loadMembersPanel(activeTtId);
  }

  if (action === 'remove') {
    const { error } = await supabase
      .from('timetable_members')
      .delete()
      .eq('id', btn.dataset.memberId);
    if (error) { console.error('Remove failed:', error.message); btn.disabled = false; return; }
    loadMembersPanel(activeTtId);
  }
});

// ── Send invite ───────────────────────────────────────────

btnSendInvite.addEventListener('click', async () => {
  const email = inputInviteEmail.value.trim().toLowerCase();
  membersInviteErr.textContent = '';
  membersInviteErr.classList.remove('visible');

  if (!email || !email.includes('@')) {
    membersInviteErr.textContent = 'Please enter a valid email address.';
    membersInviteErr.classList.add('visible');
    inputInviteEmail.focus();
    return;
  }

  btnSendInvite.disabled = true;
  btnSendInvite.classList.add('loading');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Insert invite row
    const { data: invite, error: insertErr } = await supabase
      .from('timetable_invites')
      .insert({
        timetable_id:   activeTtId,
        timetable_name: activeTtName,
        invited_by:     user.id,
        invited_email:  email,
      })
      .select('id, token')
      .single();

    if (insertErr) throw insertErr;

    inputInviteEmail.value = '';
    loadMembersPanel(activeTtId);
  } catch (err) {
    console.error('Send invite failed:', err);
    membersInviteErr.textContent = err.message || 'Something went wrong. Please try again.';
    membersInviteErr.classList.add('visible');
  } finally {
    btnSendInvite.disabled = false;
    btnSendInvite.classList.remove('loading');
  }
});

// ── Shared timetables (member of others') ─────────────────

async function loadSharedTimetables(userId) {
  const { data: memberships, error } = await supabase
    .from('timetable_members')
    .select('joined_at, timetables(id, name, description, updated_at)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) { console.error('Failed to load shared timetables:', error.message); return; }

  const timetables = (memberships || [])
    .map(m => m.timetables)
    .filter(Boolean);

  renderSharedGrid(timetables);
}

function renderSharedGrid(timetables) {
  const section = document.getElementById('section-shared');
  const grid    = document.getElementById('grid-shared');

  if (timetables.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  grid.innerHTML = timetables.map(tt => {
    const descHtml = tt.description
      ? `<p class="card-desc">${escapeHtml(tt.description)}</p>`
      : '';
    const dateText = tt.updated_at ? `Updated ${formatDate(tt.updated_at)}` : '';
    return `
      <div class="timetable-card timetable-card--shared">
        <div class="card-body">
          <div class="card-header-row">
            <h3 class="card-name">${escapeHtml(tt.name)}</h3>
            <span class="status-badge status-badge--shared">Shared</span>
          </div>
          ${descHtml}
        </div>
        <div class="card-footer">
          <span class="card-date">${dateText}</span>
          <div class="card-footer-actions">
            <a class="btn btn-sm btn-primary" href="admin.html?id=${tt.id}">
              View
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── My pending invites (received) ─────────────────────────

async function loadMyInvites() {
  const { data: invites } = await supabase
    .from('timetable_invites')
    .select('id, timetable_id, timetable_name, invited_by, expires_at')
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  renderMyInvites(invites || []);
}

function renderMyInvites(invites) {
  const section = document.getElementById('section-my-invites');
  const list    = document.getElementById('list-my-invites');

  if (invites.length === 0) {
    section.hidden = true;
    list.innerHTML = '';
    return;
  }

  section.hidden = false;
  list.innerHTML = invites.map(inv => {
    const exp = new Date(inv.expires_at).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short',
    });
    return `
      <li class="my-invite-item">
        <div class="my-invite-body">
          <span class="my-invite-name">${escapeHtml(inv.timetable_name)}</span>
          <span class="my-invite-meta">Expires ${exp}</span>
        </div>
        <div class="my-invite-actions">
          <button class="btn btn-sm btn-ghost"
                  data-my-action="decline"
                  data-invite-id="${inv.id}">
            Decline
          </button>
          <button class="btn btn-sm btn-primary"
                  data-my-action="accept"
                  data-invite-id="${inv.id}"
                  data-timetable-id="${inv.timetable_id}"
                  data-invited-by="${inv.invited_by}">
            Accept
          </button>
        </div>
      </li>`;
  }).join('');
}

document.getElementById('list-my-invites').addEventListener('click', async e => {
  const btn = e.target.closest('[data-my-action]');
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  const action   = btn.dataset.myAction;
  const inviteId = btn.dataset.inviteId;

  if (action === 'accept') {
    const { data: { user } } = await supabase.auth.getUser();

    // Insert member row first — RLS verifies the pending invite exists
    const { error: joinErr } = await supabase
      .from('timetable_members')
      .insert({
        timetable_id: btn.dataset.timetableId,
        user_id:      user.id,
        invited_by:   btn.dataset.invitedBy,
      });

    if (joinErr) {
      console.error('Failed to join timetable:', joinErr.message);
      btn.disabled = false;
      return;
    }

    // Mark invite as accepted after successfully joining
    await supabase
      .from('timetable_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);
  }

  if (action === 'decline') {
    const { error } = await supabase
      .from('timetable_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) {
      console.error('Failed to decline invite:', error.message);
      btn.disabled = false;
      return;
    }
  }

  loadMyInvites();
});

// ── Start ─────────────────────────────────────────────────

initPortal();
