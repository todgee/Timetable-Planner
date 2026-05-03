/* ==========================================================
   ACCEPT-INVITE.JS
   Validates an invite token and adds the signed-in user as
   a timetable member.
   ========================================================== */

async function initAcceptInvite() {
  await window.authReady;

  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');

  if (!token) {
    showError('No invite token found. Check the link in your email and try again.');
    return;
  }

  // Redirect to login if not authenticated, preserving the return URL
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.replace(`login.html?return=${returnUrl}`);
    return;
  }

  document.body.style.visibility = 'visible';

  // Look up the invite by token — RLS allows this only if the user's email matches
  const { data: invite, error } = await supabase
    .from('timetable_invites')
    .select('id, timetable_id, timetable_name, invited_by, invited_email, status, expires_at, role')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    showError("This invite link isn't valid for your account. Make sure you're signed in with the email address that was invited.");
    return;
  }

  if (invite.status === 'accepted') {
    showError('This invite has already been accepted.', true);
    return;
  }

  if (invite.status === 'revoked') {
    showError('This invite has been revoked by the timetable owner.');
    return;
  }

  if (new Date(invite.expires_at) < new Date()) {
    showError('This invite has expired. Ask the timetable owner to send a new one.');
    return;
  }

  // Show the timetable name and confirmation button
  const timetableName = invite.timetable_name || 'a timetable';
  document.getElementById('accept-title').textContent = "You've been invited!";
  document.getElementById('accept-sub').innerHTML =
    `You've been invited to access <strong>${escapeHtml(timetableName)}</strong>.<br>
     Accept below to join.`;
  document.getElementById('accept-actions').hidden = false;

  document.getElementById('btn-accept').addEventListener('click', async () => {
    await acceptInvite(invite, timetableName, user);
  });
}

async function acceptInvite(invite, timetableName, user) {
  const btn = document.getElementById('btn-accept');
  btn.disabled = true;
  btn.classList.add('loading');
  setStatus('');

  try {
    // Add to timetable_members
    const { error: memberErr } = await supabase
      .from('timetable_members')
      .insert({
        timetable_id: invite.timetable_id,
        user_id:      user.id,
        invited_by:   invite.invited_by,
        role:         invite.role || 'read',
      });

    // Ignore duplicate — user may have already joined
    if (memberErr && !memberErr.message.includes('duplicate')) {
      throw memberErr;
    }

    // Mark invite as accepted
    await supabase
      .from('timetable_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    setStatus(`You've joined "${timetableName}"! Redirecting…`);
    setTimeout(() => { window.location.replace('portal.html'); }, 1500);
  } catch (err) {
    console.error('Accept invite failed:', err);
    setStatus('Something went wrong. Please try again.', true);
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

function showError(msg, isInfo = false) {
  document.body.style.visibility = 'visible';
  document.getElementById('accept-sub').textContent = msg;
  document.getElementById('accept-sub').style.color = isInfo ? '#4a5c54' : '#b04040';
  document.getElementById('accept-actions').hidden = true;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('accept-status');
  el.textContent = msg;
  el.className = 'accept-status' + (isError ? ' error' : '');
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

initAcceptInvite();
