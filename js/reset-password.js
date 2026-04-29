/* ==========================================================
   RESET-PASSWORD.JS
   Handles the Supabase PASSWORD_RECOVERY flow.
   The reset link in the email lands here with a token in the
   URL hash; the Supabase SDK exchanges it for a session and
   fires the PASSWORD_RECOVERY auth state change event.
   ========================================================== */

document.getElementById('copyright-year').textContent = new Date().getFullYear();

/* ── State management ────────────────────────────────────── */

function showState(id) {
  ['state-loading', 'state-form', 'state-success', 'state-invalid'].forEach(s => {
    document.getElementById(s).classList.toggle('active', s === id);
  });
}

/* ── Wait for the PASSWORD_RECOVERY event ────────────────── */

// Set a timeout so we don't hang on loading forever if the token
// is missing (e.g. user navigated here directly with no link)
const tokenTimeout = setTimeout(() => showState('state-invalid'), 5000);

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    clearTimeout(tokenTimeout);
    showState('state-form');
  }

  // If the user somehow has a normal session (navigated here while
  // signed in) just redirect them to the portal
  if (event === 'SIGNED_IN' && session && !window._recoveryActive) {
    clearTimeout(tokenTimeout);
    window.location.replace('portal.html');
  }
});

window._recoveryActive = false;

// Also handle the case where the SDK already processed the token
// before our listener was registered (fast page loads)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user && document.getElementById('state-loading').classList.contains('active')) {
    clearTimeout(tokenTimeout);
    // Can't tell from getSession alone if this is a recovery session,
    // so we rely on the onAuthStateChange event above. If we reach
    // here without the event firing, show the form optimistically.
    showState('state-form');
  }
});

/* ── Password strength ───────────────────────────────────── */

function measureStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length === 0) return null;
  if (score <= 1) return { level: 1, label: 'Weak',   cls: 'weak' };
  if (score === 2) return { level: 2, label: 'Fair',   cls: 'fair' };
  if (score === 3) return { level: 3, label: 'Good',   cls: 'good' };
  return               { level: 4, label: 'Strong', cls: 'strong' };
}

function renderStrength(strength) {
  const container = document.getElementById('password-strength');
  if (!strength) { container.innerHTML = ''; return; }

  const labels = ['filled-weak', 'filled-fair', 'filled-good', 'filled-strong'];
  const bars = [1, 2, 3, 4].map(n => {
    const cls = n <= strength.level ? labels[strength.level - 1] : '';
    return `<span class="strength-bar ${cls}"></span>`;
  }).join('');

  container.innerHTML = `
    <div class="strength-bars">${bars}</div>
    <span class="strength-label ${strength.cls}">${strength.label}</span>
  `;
}

document.getElementById('reset-password').addEventListener('input', e => {
  renderStrength(measureStrength(e.target.value));
});

/* ── Validation helpers ──────────────────────────────────── */

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function setInvalid(id) {
  document.getElementById(id)?.classList.add('invalid');
}

function clearInvalid(id) {
  document.getElementById(id)?.classList.remove('invalid');
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function clearFormError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

/* ── Password visibility toggle ─────────────────────────── */

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  btn.style.color = isHidden ? '#2a5c4e' : '';
}

/* ── Blur validation ─────────────────────────────────────── */

document.getElementById('reset-password').addEventListener('blur', e => {
  const v = e.target.value;
  if (!v) {
    showFieldError('reset-password-error', 'Password is required.');
    setInvalid('reset-password');
  } else if (v.length < 8) {
    showFieldError('reset-password-error', 'Password must be at least 8 characters.');
    setInvalid('reset-password');
  } else {
    clearFieldError('reset-password-error');
    clearInvalid('reset-password');
  }
});

document.getElementById('reset-password').addEventListener('input', () => {
  clearFieldError('reset-password-error');
  clearInvalid('reset-password');
});

document.getElementById('reset-confirm').addEventListener('blur', e => {
  const pw = document.getElementById('reset-password').value;
  const v  = e.target.value;
  if (!v) {
    showFieldError('reset-confirm-error', 'Please confirm your password.');
    setInvalid('reset-confirm');
  } else if (v !== pw) {
    showFieldError('reset-confirm-error', 'Passwords do not match.');
    setInvalid('reset-confirm');
  } else {
    clearFieldError('reset-confirm-error');
    clearInvalid('reset-confirm');
  }
});

document.getElementById('reset-confirm').addEventListener('input', () => {
  clearFieldError('reset-confirm-error');
  clearInvalid('reset-confirm');
});

/* ── Form submit ─────────────────────────────────────────── */

document.getElementById('form-reset').addEventListener('submit', async e => {
  e.preventDefault();
  clearFormError('reset-form-error');

  const password = document.getElementById('reset-password').value;
  const confirm  = document.getElementById('reset-confirm').value;
  let valid = true;

  if (!password) {
    showFieldError('reset-password-error', 'Password is required.');
    setInvalid('reset-password');
    valid = false;
  } else if (password.length < 8) {
    showFieldError('reset-password-error', 'Password must be at least 8 characters.');
    setInvalid('reset-password');
    valid = false;
  }

  if (!confirm) {
    showFieldError('reset-confirm-error', 'Please confirm your password.');
    setInvalid('reset-confirm');
    valid = false;
  } else if (password && confirm !== password) {
    showFieldError('reset-confirm-error', 'Passwords do not match.');
    setInvalid('reset-confirm');
    valid = false;
  }

  if (!valid) return;

  const btn = document.getElementById('reset-submit');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    // Sign the user out so they go through a clean login flow
    await supabase.auth.signOut();
    showState('state-success');
  } catch (err) {
    showFormError('reset-form-error', err.message || 'Could not update password. Please try again.');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});
