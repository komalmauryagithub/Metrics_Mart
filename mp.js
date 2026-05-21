// mp.js

const BASE_URL =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

if (window.location.protocol === "file:") {
  window.location.replace(`${BASE_URL}/mp.html`);
}

function showLoginForm() {
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
}

function showRegisterForm() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.remove('hidden');
}

function openForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (!modal) return;

  modal.classList.remove('hidden');
}

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  const form = document.getElementById('forgotPasswordForm');

  if (modal) {
    modal.classList.add('hidden');
  }

  if (form) {
    form.reset();
  }
}

function handleForgotPasswordBackdrop(event) {
  if (event.target?.id === 'forgotPasswordModal') {
    closeForgotPasswordModal();
  }
}

async function parseApiResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_error) {
    const normalized = text.trim();
    return {
      success: false,
      message: normalized.startsWith("<")
        ? "Server returned an error page instead of JSON. Please check the live server deployment and logs."
        : normalized.slice(0, 240) || "Invalid response from server",
    };
  }
}

// Popup Functions
function showPopup(title, message, isSuccess) {
  const popup = document.getElementById('popup');
  const icon = document.getElementById('popupIcon');
  const titleEl = document.getElementById('popupTitle');
  const msgEl = document.getElementById('popupMessage');

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (isSuccess) {
    icon.className = 'fas fa-check-circle';
    icon.style.color = '#0f766e';
  } else {
    icon.className = 'fas fa-exclamation-circle';
    icon.style.color = '#ef4444';
  }

  popup.classList.remove('hidden');
}

function closePopup() {
  document.getElementById('popup').classList.add('hidden');
}

function getRedirectPage(role) {
  switch ((role || '').toLowerCase().trim()) {
    case 'admin':
      return 'admin.html';
    case 'hr':
      return 'hr.html';
    case 'tme':
      return 'tme.html';
    case 'me':
      return 'me.html';
    case 'dev':
      return 'dev.html';
    case 'seo':
      return 'seo.html';
    case 'smo':
      return 'seo.html';
    case 'accounts':
      return 'accounts.html';
    // case 'dm':
    //   return 'seo.html';
    default:
      return null;
  }
}

// Register Form (same as before)
document.getElementById('registerFormElement').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const btn = document.getElementById('registerBtn');
  const originalText = btn.innerHTML;

  btn.innerHTML = 'Creating Account...';
  btn.disabled = true;

  try {
    const response = await fetch(`${BASE_URL}/register`, { method: 'POST', body: formData });
    const result = await parseApiResponse(response);

    if (response.ok && result.success) {
      showPopup('Success!', result.message || 'Registration successful!', true);
      this.reset();
    } else {
      showPopup('Error', result.message || 'Something went wrong', false);
    }
  } catch (error) {
    showPopup('Error', 'Server error. Please try again.', false);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

document.getElementById("loginFormElement").addEventListener("submit", async function (e) {
  e.preventDefault();

  const emailOrContact = this.emailOrContact.value.trim();
  const password = this.password.value;
  const btn = document.getElementById("loginBtn");
  const originalText = btn.innerHTML;

  btn.innerHTML = 'Logging in...';
  btn.disabled = true;

  try {
    const body = new URLSearchParams();
    body.append("emailOrContact", emailOrContact);
    body.append("password", password);

    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      body
    });

    const data = await parseApiResponse(res);

    if (res.ok && data.success) {
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      const redirectPage = getRedirectPage(data.user?.role);

      if (!redirectPage) {
        showPopup("Login Failed", "This role does not have a dashboard assigned yet.", false);
        return;
      }

      showPopup("Welcome!", `Login successful as ${data.user.role}`, true);

      setTimeout(() => {
        window.location.href = redirectPage;
      }, 1200);
    } else {
      showPopup("Login Failed", data.message || "Invalid credentials", false);
    }

  } catch (error) {
    showPopup("Error", "Server error. Please try again.", false);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const LOCAL_PASSWORD_RESET_OTP_HINT_KEY = "mm_local_password_reset_otp_hint";

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const payload = {
      email: String(formData.get("email") || "").trim(),
    };
    const btn = document.getElementById("forgotPasswordBtn");
    const originalText = btn?.innerHTML || "";

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Sending Link...';
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await parseApiResponse(res);

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Unable to reset password");
      }

      closeForgotPasswordModal();
      showPopup(
        "Success",
        result.message || "If your email is registered, a password reset OTP has been sent.",
        true,
      );

      if (result.debugOtp) {
        sessionStorage.setItem(LOCAL_PASSWORD_RESET_OTP_HINT_KEY, result.debugOtp);
      } else {
        sessionStorage.removeItem(LOCAL_PASSWORD_RESET_OTP_HINT_KEY);
      }

      if (result.requiresOtp || result.deliveryMode === "local_otp") {
        window.setTimeout(() => {
          window.location.href =
            result.redirectUrl || `${BASE_URL}/reset-password.html?mode=otp`;
        }, 1000);
      }
    } catch (error) {
      showPopup("Error", error.message || "Unable to send reset email", false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}



