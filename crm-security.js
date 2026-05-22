(function () {
  "use strict";

  const SHIELD_MESSAGE = "Screen protected";
  const WATERMARK_COUNT = 36;

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null") || {};
    } catch (error) {
      return {};
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

  function showShield(duration = 1600) {
    const shield = ensureShield();
    document.documentElement.classList.add("crm-blackout");
    shield.classList.add("is-visible");

    window.clearTimeout(showShield.hideTimer);
    showShield.hideTimer = window.setTimeout(() => {
      if (!document.hidden) {
        document.documentElement.classList.remove("crm-blackout");
        shield.classList.remove("is-visible");
      }
    }, duration);
  }

  function showInstantBlackout(duration = 2500) {
    window.clearTimeout(showInstantBlackout.timer);
    showShield(duration);
  }

  function hideShield() {
    if (document.hidden) return;

    const shield = ensureShield();
    document.documentElement.classList.remove("crm-blackout");
    shield.classList.remove("is-visible");
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
    const isShiftPressed = event.key === "Shift" || event.shiftKey;
    const hasWindowsModifier =
      event.metaKey ||
      event.getModifierState?.("Meta") ||
      event.getModifierState?.("OS");
    const isWindowsSnip = hasWindowsModifier && event.shiftKey && key === "s";
    const isDevtools =
      event.key === "F12" ||
      (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
    const isPrintScreen = event.key === "PrintScreen";

    if (isShiftPressed) {
      showInstantBlackout(2500);
    }

    if (
      isPrint ||
      isSave ||
      isViewSource ||
      isDevtools ||
      isPrintScreen ||
      isWindowsSnip
    ) {
      event.preventDefault();
      showShield(isPrintScreen || isWindowsSnip ? 3000 : 2400);

      if (isPrintScreen && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText("").catch(() => {});
      }
    }
  }

  function handleVisibilityChange() {
    document.documentElement.classList.toggle("crm-screen-hidden", document.hidden);
  }

  function handleWindowBlur() {
    showShield(6000);
  }

  function handleWindowFocus() {
    window.clearTimeout(handleWindowFocus.timer);
    handleWindowFocus.timer = window.setTimeout(hideShield, 1200);
  }

  function initCrmSecurity() {
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
