(function () {
  "use strict";

  const SHIELD_MESSAGE = "Screen protected";
  const SHORTCUT_SHIELD_DURATION_MS = 2400;
  const SCREENSHOT_SHIELD_DURATION_MS = 6000;
  const SHIFT_SCREENSHOT_DELAY_MS = 120;
  const WATERMARK_COUNT = 36;
  let pendingShiftShieldTimer = null;

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null") || {};
    } catch (error) {
      return {};
    }
  }

  function getCompanyKey(user = getCurrentUser()) {
    const normalized = String(
      user.company_key || user.selected_company || user.comp_name || "",
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (normalized === "redsea" || normalized === "redseadigitals") {
      return "redsea";
    }

    return "metrics";
  }

  function applyCompanyTheme() {
    const user = getCurrentUser();
    const isRedSea = getCompanyKey(user) === "redsea";

    document.body.classList.toggle("redsea-company", isRedSea);
    document.documentElement.classList.toggle("redsea-company", isRedSea);

    if (isRedSea) {
      document.title = document.title.replace(/^Metrics/i, "RedSea");
      document.querySelectorAll(".brand-panel").forEach((element) => {
        const roleLabel = String(user.role || element.textContent || "")
          .toUpperCase()
          .trim();
        element.textContent = roleLabel ? `REDSEA ${roleLabel}` : "REDSEA";
      });
    }
  }

  function formatStampDate(date) {
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getWatermarkText() {
    const user = getCurrentUser();
    const identity = [user.name, user.email || user.contact, user.role]
      .filter(Boolean)
      .join(" | ");

    return `${identity || "Metrics Mart CRM"}\n${formatStampDate(new Date())}`;
  }

  function ensureShield() {
    let shield = document.querySelector(".crm-security-shield");
    if (!shield) {
      shield = document.createElement("div");
      shield.className = "crm-security-shield";
      shield.setAttribute("aria-live", "polite");
      shield.textContent = SHIELD_MESSAGE;
      document.body.appendChild(shield);
    }
    return shield;
  }

  function canHideShield() {
    return !document.hidden && (!document.hasFocus || document.hasFocus());
  }

  function clearPendingShiftShield() {
    window.clearTimeout(pendingShiftShieldTimer);
    pendingShiftShieldTimer = null;
  }

  function armShiftScreenshotShield() {
    clearPendingShiftShield();
    pendingShiftShieldTimer = window.setTimeout(() => {
      pendingShiftShieldTimer = null;
      showShield(SCREENSHOT_SHIELD_DURATION_MS);
    }, SHIFT_SCREENSHOT_DELAY_MS);
  }

  function showShield(duration = 1600) {
    const shield = ensureShield();
    document.documentElement.classList.add("crm-blackout");
    shield.classList.add("is-visible");

    window.clearTimeout(showShield.hideTimer);
    showShield.hideTimer = window.setTimeout(() => {
      if (canHideShield()) {
        document.documentElement.classList.remove("crm-blackout");
        shield.classList.remove("is-visible");
      }
    }, duration);
  }

  function hideShield() {
    if (!canHideShield()) return;

    const shield = ensureShield();
    document.documentElement.classList.remove("crm-blackout");
    shield.classList.remove("is-visible");
  }

  function isShiftTypingInput(event, hasWindowsModifier) {
    const key = String(event.key || "");
    return (
      event.type === "keydown" &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !hasWindowsModifier &&
      key.length === 1
    );
  }

  function buildWatermark() {
    document.querySelectorAll(".crm-watermark-layer").forEach((layer) => {
      layer.remove();
    });
  }

  function updateWatermark() {
    const text = getWatermarkText();
    document.querySelectorAll(".crm-watermark-item").forEach((item) => {
      item.textContent = text;
    });
  }

  function blockPrint(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    showShield(2400);
    return false;
  }

  function handleKeydown(event) {
    const key = String(event.key || "").toLowerCase();
    const isPrint = event.ctrlKey && key === "p";
    const isSave = event.ctrlKey && key === "s";
    const isViewSource = event.ctrlKey && key === "u";
    const hasWindowsModifier =
      event.metaKey ||
      event.getModifierState?.("Meta") ||
      event.getModifierState?.("OS");
    const isWindowsSnip = hasWindowsModifier && event.shiftKey && key === "s";
    const isDevtools =
      event.key === "F12" ||
      (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
    const isPrintScreen = event.key === "PrintScreen";
    const isScreenshotShortcut = isPrintScreen || isWindowsSnip;

    if (event.type === "keyup" && event.key === "Shift") {
      clearPendingShiftShield();
      return;
    }

    if (isShiftTypingInput(event, hasWindowsModifier)) {
      clearPendingShiftShield();
      hideShield();
      return;
    }

    if (event.type === "keydown" && event.key === "Shift") {
      armShiftScreenshotShield();
      return;
    }

    if (
      isPrint ||
      isSave ||
      isViewSource ||
      isDevtools ||
      isScreenshotShortcut
    ) {
      event.preventDefault();
      clearPendingShiftShield();
      showShield(
        isScreenshotShortcut
          ? SCREENSHOT_SHIELD_DURATION_MS
          : SHORTCUT_SHIELD_DURATION_MS,
      );

      if (isPrintScreen && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText("").catch(() => {});
      }
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      clearPendingShiftShield();
    }
    document.documentElement.classList.toggle("crm-screen-hidden", document.hidden);
  }

  function handleWindowBlur() {
    clearPendingShiftShield();
    showShield(SCREENSHOT_SHIELD_DURATION_MS);
  }

  function handleWindowFocus() {
    clearPendingShiftShield();
    window.clearTimeout(handleWindowFocus.timer);
    handleWindowFocus.timer = window.setTimeout(hideShield, 1200);
  }

  function initCrmSecurity() {
    applyCompanyTheme();
    ensureShield();
    buildWatermark();

    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("keyup", handleKeydown, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("beforeprint", blockPrint);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCrmSecurity);
  } else {
    initCrmSecurity();
  }
})();
