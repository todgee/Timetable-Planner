/* ==========================================================
   AUTH.JS — Sign In / Create Account page logic
   Requires supabase-client.js to be loaded first.
   ========================================================== */

/* ── Tab switching ───────────────────────────────────────── */

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => {
    el.classList.toggle('active', el.id === `tab-${tab}`);
    el.setAttribute('aria-selected', el.id === `tab-${tab}`);
  });

  document.querySelectorAll('.auth-panel').forEach(el => {
    el.classList.toggle('active', el.id === `panel-${tab}`);
  });

  clearAllErrors();
}

/* ── Password visibility toggle ─────────────────────────── */

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  btn.style.color = isHidden ? '#2a5c4e' : '';
}

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

document.getElementById('signup-password').addEventListener('input', e => {
  renderStrength(measureStrength(e.target.value));
});

/* ── Validation helpers ──────────────────────────────────── */

function showFieldError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function setInvalid(inputId) {
  document.getElementById(inputId)?.classList.add('invalid');
}

function clearInvalid(inputId) {
  document.getElementById(inputId)?.classList.remove('invalid');
}

function showFormError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function clearFormError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function setLoading(formId, loading) {
  const btn = document.querySelector(`#${formId} .btn-auth`);
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

/* ── Post-login redirect ─────────────────────────────────── */

function redirectAfterSignIn() {
  const raw = localStorage.getItem('timetable.data');
  try {
    const data = raw ? JSON.parse(raw) : null;
    if (data && (data.peopleList?.length || data.classList?.length)) {
      window.location.href = 'admin.html';
      return;
    }
  } catch (_) { /* fall through */ }
  window.location.href = 'setup.html';
}

/* ── Sign In ─────────────────────────────────────────────── */

document.getElementById('form-signin').addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  let valid = true;

  if (!email) {
    showFieldError('signin-email-error', 'Email is required.');
    setInvalid('signin-email');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('signin-email-error', 'Enter a valid email address.');
    setInvalid('signin-email');
    valid = false;
  }

  if (!password) {
    showFieldError('signin-password-error', 'Password is required.');
    setInvalid('signin-password');
    valid = false;
  }

  if (!valid) return;

  setLoading('form-signin', true);

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    redirectAfterSignIn();
  } catch (err) {
    const msg = err.message?.toLowerCase().includes('invalid login')
      ? 'Incorrect email or password.'
      : (err.message || 'Sign in failed. Please try again.');
    showFormError('signin-form-error', msg);
    setLoading('form-signin', false);
  }
});

/* ── Create Account ──────────────────────────────────────── */

document.getElementById('form-signup').addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const firstName    = document.getElementById('signup-firstname').value.trim();
  const lastName     = document.getElementById('signup-lastname').value.trim();
  const email        = document.getElementById('signup-email').value.trim();
  const organisation = document.getElementById('signup-organisation').value.trim();
  const role         = document.getElementById('signup-role').value;
  const password     = document.getElementById('signup-password').value;
  const confirm      = document.getElementById('signup-confirm').value;
  const termsChecked = document.getElementById('signup-terms').checked;
  let valid = true;

  if (!firstName) {
    showFieldError('signup-firstname-error', 'First name is required.');
    setInvalid('signup-firstname');
    valid = false;
  }

  if (!lastName) {
    showFieldError('signup-lastname-error', 'Last name is required.');
    setInvalid('signup-lastname');
    valid = false;
  }

  if (!email) {
    showFieldError('signup-email-error', 'Email is required.');
    setInvalid('signup-email');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('signup-email-error', 'Enter a valid email address.');
    setInvalid('signup-email');
    valid = false;
  }

  if (!password) {
    showFieldError('signup-password-error', 'Password is required.');
    setInvalid('signup-password');
    valid = false;
  } else if (password.length < 8) {
    showFieldError('signup-password-error', 'Password must be at least 8 characters.');
    setInvalid('signup-password');
    valid = false;
  }

  if (!confirm) {
    showFieldError('signup-confirm-error', 'Please confirm your password.');
    setInvalid('signup-confirm');
    valid = false;
  } else if (password && confirm !== password) {
    showFieldError('signup-confirm-error', 'Passwords do not match.');
    setInvalid('signup-confirm');
    valid = false;
  }

  if (!termsChecked) {
    showFieldError('signup-terms-error', 'You must accept the terms to continue.');
    valid = false;
  }

  if (!valid) return;

  setLoading('form-signup', true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name:   firstName,
          last_name:    lastName,
          full_name:    `${firstName} ${lastName}`,
          organisation: organisation || null,
          role:         role         || null,
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      // Email confirmation disabled — user is signed in immediately
      window.location.href = 'setup.html';
    } else {
      // Email confirmation enabled — tell user to check their inbox
      showConfirmationMessage(email);
    }
  } catch (err) {
    const msg = err.message?.toLowerCase().includes('already registered')
      ? 'An account with this email already exists.'
      : (err.message || 'Account creation failed. Please try again.');
    showFormError('signup-form-error', msg);
    setLoading('form-signup', false);
  }
});

/* ── Email confirmation notice ───────────────────────────── */

function showConfirmationMessage(email) {
  const panel = document.getElementById('panel-signup');
  panel.innerHTML = `
    <div class="auth-confirm">
      <div class="auth-confirm-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <rect x="2" y="4" width="20" height="16" rx="3"/>
          <polyline points="2,4 12,13 22,4"/>
        </svg>
      </div>
      <h2>Check your email</h2>
      <p>We've sent a confirmation link to <strong>${email}</strong>.<br>Click it to activate your account, then come back to sign in.</p>
      <button class="btn btn-primary btn-auth" style="margin-top:1.5rem" onclick="switchTab('signin')">Back to Sign In</button>
    </div>
  `;
}

/* ── Forgot password modal ───────────────────────────────── */

function showForgotPassword(e) {
  e.preventDefault();
  document.getElementById('forgot-modal').hidden = false;
  document.getElementById('forgot-email').focus();
}

function closeForgotPassword() {
  document.getElementById('forgot-modal').hidden = true;
  clearFormError('forgot-form-error');
  clearFieldError('forgot-email-error');
  clearInvalid('forgot-email');
  document.getElementById('form-forgot').reset();
}

document.getElementById('forgot-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeForgotPassword();
});

document.getElementById('form-forgot').addEventListener('submit', async e => {
  e.preventDefault();
  clearFieldError('forgot-email-error');
  clearFormError('forgot-form-error');
  clearInvalid('forgot-email');

  const email = document.getElementById('forgot-email').value.trim();

  if (!email) {
    showFieldError('forgot-email-error', 'Email is required.');
    setInvalid('forgot-email');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('forgot-email-error', 'Enter a valid email address.');
    setInvalid('forgot-email');
    return;
  }

  const btn = e.target.querySelector('.btn-auth');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth.html`
    });
    if (error) throw error;

    // Replace form with success message
    document.querySelector('.modal-body').innerHTML = `
      <div class="auth-confirm" style="padding-top:0.5rem">
        <div class="auth-confirm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <rect x="2" y="4" width="20" height="16" rx="3"/>
            <polyline points="2,4 12,13 22,4"/>
          </svg>
        </div>
        <h2 style="font-size:1.2rem">Reset link sent</h2>
        <p>Check <strong>${email}</strong> for a password reset link.</p>
        <button class="btn btn-primary btn-auth" style="margin-top:1.25rem" onclick="closeForgotPassword()">Done</button>
      </div>
    `;
  } catch (err) {
    showFormError('forgot-form-error', err.message || 'Could not send reset email. Please try again.');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

/* ── Inline validation on blur ───────────────────────────── */

function attachBlurValidation(inputId, errorId, validate) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('blur', () => {
    const msg = validate(input.value);
    if (msg) {
      showFieldError(errorId, msg);
      setInvalid(inputId);
    } else {
      clearFieldError(errorId);
      clearInvalid(inputId);
    }
  });
  input.addEventListener('input', () => {
    clearFieldError(errorId);
    clearInvalid(inputId);
  });
}

attachBlurValidation('signin-email', 'signin-email-error', v =>
  !v.trim() ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email address.' : ''
);

attachBlurValidation('signup-email', 'signup-email-error', v =>
  !v.trim() ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email address.' : ''
);

attachBlurValidation('signup-password', 'signup-password-error', v =>
  !v ? 'Password is required.' : v.length < 8 ? 'Password must be at least 8 characters.' : ''
);

attachBlurValidation('signup-confirm', 'signup-confirm-error', v => {
  const pw = document.getElementById('signup-password').value;
  return !v ? 'Please confirm your password.' : v !== pw ? 'Passwords do not match.' : '';
});

/* ── Copyright year ──────────────────────────────────────── */

document.getElementById('copyright-year').textContent = new Date().getFullYear();
