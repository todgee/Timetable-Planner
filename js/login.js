/* ==========================================================
   LOGIN.JS — sign in, sign up, forgot password
   ========================================================== */

// ── SVG icons ─────────────────────────────────────────────

const EYE_OPEN = `<svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// ── Tab switching ──────────────────────────────────────────

const tabSignin  = document.getElementById('tab-signin');
const tabSignup  = document.getElementById('tab-signup');
const panelSignin = document.getElementById('panel-signin');
const panelSignup = document.getElementById('panel-signup');

function showTab(tab) {
  const isSignin = tab === 'signin';
  tabSignin.classList.toggle('active', isSignin);
  tabSignup.classList.toggle('active', !isSignin);
  tabSignin.setAttribute('aria-selected', String(isSignin));
  tabSignup.setAttribute('aria-selected', String(!isSignin));
  panelSignin.classList.toggle('active', isSignin);
  panelSignup.classList.toggle('active', !isSignin);
  document.title = isSignin
    ? 'Sign In – Timetable Planner'
    : 'Create Account – Timetable Planner';
}

tabSignin.addEventListener('click', () => showTab('signin'));
tabSignup.addEventListener('click', () => showTab('signup'));
document.getElementById('link-to-signup').addEventListener('click', () => showTab('signup'));
document.getElementById('link-to-signin').addEventListener('click', () => showTab('signin'));

if (new URLSearchParams(location.search).get('tab') === 'signup') showTab('signup');

// ── Password show / hide ───────────────────────────────────

document.querySelectorAll('.btn-show-password').forEach(btn => {
  btn.innerHTML = EYE_OPEN;
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
});

// ── Password strength (sign-up only) ──────────────────────

const signupPwdInput = document.getElementById('signup-password');
const strengthBars   = [1, 2, 3, 4].map(n => document.getElementById(`bar-${n}`));
const strengthLabel  = document.getElementById('strength-label');

const STRENGTH = [
  { label: 'Weak',   cls: 'weak',   fill: 'filled-weak' },
  { label: 'Fair',   cls: 'fair',   fill: 'filled-fair' },
  { label: 'Good',   cls: 'good',   fill: 'filled-good' },
  { label: 'Strong', cls: 'strong', fill: 'filled-strong' },
];

function scorePassword(pwd) {
  if (!pwd) return -1;
  let n = 0;
  if (pwd.length >= 8)  n++;
  if (pwd.length >= 12) n++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) n++;
  if (/\d/.test(pwd))          n++;
  if (/[^A-Za-z0-9]/.test(pwd)) n++;
  return Math.min(Math.floor(n / 1.25), 3); // 0–3
}

signupPwdInput.addEventListener('input', () => {
  const score = scorePassword(signupPwdInput.value);
  strengthBars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (score >= 0 && i <= score) bar.classList.add(STRENGTH[score].fill);
  });
  if (score < 0) {
    strengthLabel.textContent = '';
    strengthLabel.className = 'strength-label';
  } else {
    strengthLabel.textContent = STRENGTH[score].label;
    strengthLabel.className = `strength-label ${STRENGTH[score].cls}`;
  }
});

// ── UI helpers ─────────────────────────────────────────────

function setLoading(btn, on) {
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.add('visible');
}

function clearFormError(el) {
  el.textContent = '';
  el.classList.remove('visible');
}

function fieldError(id, msg) {
  document.getElementById(id).textContent = msg;
}

function friendlyError(raw) {
  if (!raw) return 'Something went wrong. Please try again.';
  const m = raw.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid email or password'))
    return 'Incorrect email or password.';
  if (m.includes('email not confirmed'))
    return 'Please confirm your email address before signing in.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.';
  if (m.includes('password should be') || m.includes('at least'))
    return 'Password must be at least 8 characters.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts — please wait a moment and try again.';
  if (m.includes('unable to validate') || m.includes('not a valid'))
    return 'Please enter a valid email address.';
  return raw;
}

// ── Sign In ────────────────────────────────────────────────

const signinError = document.getElementById('signin-error');
const btnSignin   = document.getElementById('btn-signin');

document.getElementById('form-signin').addEventListener('submit', async e => {
  e.preventDefault();
  clearFormError(signinError);

  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  let ok = true;
  fieldError('signin-email-error',    !email    ? 'Email is required.'    : '');
  fieldError('signin-password-error', !password ? 'Password is required.' : '');
  if (!email || !password) return;

  setLoading(btnSignin, true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setLoading(btnSignin, false);
    showFormError(signinError, friendlyError(error.message));
    return;
  }

  window.location.replace('portal.html');
});

// ── Sign Up ────────────────────────────────────────────────

const signupError   = document.getElementById('signup-error');
const btnSignup     = document.getElementById('btn-signup');
const signupConfirm = document.getElementById('signup-confirm');
const formSignup    = document.getElementById('form-signup');

formSignup.addEventListener('submit', async e => {
  e.preventDefault();
  clearFormError(signupError);

  const firstName = document.getElementById('signup-firstname').value.trim();
  const lastName  = document.getElementById('signup-lastname').value.trim();
  const email     = document.getElementById('signup-email').value.trim();
  const password  = document.getElementById('signup-password').value;

  fieldError('signup-firstname-error', !firstName ? 'First name is required.' : '');
  fieldError('signup-email-error',     !email     ? 'Email is required.'      : '');
  fieldError('signup-password-error',  password.length < 8
    ? 'Password must be at least 8 characters.' : '');

  if (!firstName || !email || password.length < 8) return;

  setLoading(btnSignup, true);

  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, full_name: fullName },
    },
  });

  setLoading(btnSignup, false);

  if (error) {
    showFormError(signupError, friendlyError(error.message));
    return;
  }

  // Show "check your email" state
  formSignup.hidden = true;
  document.getElementById('signup-header').hidden = true;
  document.getElementById('confirm-email').textContent = email;
  signupConfirm.hidden = false;
});

// ── Forgot Password modal ──────────────────────────────────

const modalForgot    = document.getElementById('modal-forgot');
const forgotError    = document.getElementById('forgot-error');
const forgotConfirm  = document.getElementById('forgot-confirm');
const forgotFormWrap = document.getElementById('forgot-form-wrap');
const btnSendReset   = document.getElementById('btn-send-reset');

function openForgot() {
  clearFormError(forgotError);
  forgotConfirm.hidden  = true;
  forgotFormWrap.hidden = false;
  document.getElementById('forgot-email').value = '';
  fieldError('forgot-email-error', '');
  modalForgot.hidden = false;
  document.getElementById('forgot-email').focus();
}

function closeForgot() {
  modalForgot.hidden = true;
}

document.getElementById('btn-forgot').addEventListener('click', openForgot);
document.getElementById('btn-close-forgot').addEventListener('click', closeForgot);
modalForgot.addEventListener('click', e => { if (e.target === modalForgot) closeForgot(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalForgot.hidden) closeForgot();
});

btnSendReset.addEventListener('click', async () => {
  clearFormError(forgotError);
  const email = document.getElementById('forgot-email').value.trim();

  if (!email) {
    fieldError('forgot-email-error', 'Email is required.');
    return;
  }
  fieldError('forgot-email-error', '');

  setLoading(btnSendReset, true);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('reset-password.html', location.href).href,
  });

  setLoading(btnSendReset, false);

  if (error) {
    showFormError(forgotError, friendlyError(error.message));
    return;
  }

  forgotFormWrap.hidden = true;
  forgotConfirm.hidden  = false;
});
