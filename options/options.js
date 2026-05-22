const i18nData = {
  optionsTitle: browser.i18n.getMessage("optionsTitle", browser.i18n.getMessage("extensionName")),
  optionsKeyboardControlsRewind: browser.i18n.getMessage("optionsKeyboardControlsRewind"),
  optionsKeyboardControlsForward: browser.i18n.getMessage("optionsKeyboardControlsForward"),
  optionsCustomizationIntroduction: browser.i18n.getMessage("optionsCustomizationIntroduction"),
  optionsNoteNetflixDefaults: browser.i18n.getMessage("optionsNoteNetflixDefaults"),
  optionsPermissionError: browser.i18n.getMessage("optionsPermissionError"),
  optionsRequestPermission: browser.i18n.getMessage("optionsRequestPermission"),
  optionsForwardSeconds: browser.i18n.getMessage("optionsForwardSeconds"),
  optionsRewindSeconds: browser.i18n.getMessage("optionsRewindSeconds"),
  optionsRewindKey: browser.i18n.getMessage("optionsRewindKey"),
  optionsForwardKey: browser.i18n.getMessage("optionsForwardKey"),
  optionsResetToDefaults: browser.i18n.getMessage("optionsResetToDefaults"),
  optionsDefaultsSaved: browser.i18n.getMessage("optionsDefaultsSaved"),
  optionsSave: browser.i18n.getMessage("optionsSave"),
  optionsSaved: browser.i18n.getMessage("optionsSaved"),
  optionsSourceCode: browser.i18n.getMessage("optionsSourceCode"),
  optionsTranslate: browser.i18n.getMessage("optionsTranslate"),
  optionsReportIssue: browser.i18n.getMessage("optionsReportIssue"),
  optionsRequestFeature: browser.i18n.getMessage("optionsRequestFeature"),
  optionsDonate: browser.i18n.getMessage("optionsDonate"),
}
document.title = i18nData.optionsTitle;

let infoMessageTimeout;

const defaults = {
  rewindSec: 1,
  seekForwardSec: 5,
  keyObjects: {
    rewind: {
      key: ",",
      code: "Comma",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false
    },
    forward: {
      key: ".",
      code: "Period",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false
    }
  }
};

const keyObjects = {
  rewind: {},
  forward: {}
};

function setPermission(hasPermission) {
  document.getElementById('permission-error').style.display = hasPermission ? 'none' : 'block';

  if (!hasPermission) {
    document.getElementById('request-permission-btn').addEventListener('click', requestPermission);
  }
}

function requestPermission() {
  browser.permissions.request({
    origins: ["*://www.netflix.com/*"]
  }).then((granted) => {
    setPermission(granted);
  })
}

function checkPermission() {
  browser.permissions.contains({
    origins: ["*://www.netflix.com/*"]
  }).then((_hasPermission) => {
    setPermission(_hasPermission);
    if (!_hasPermission) {
      setTimeout(checkPermission, 2000);
    }
  });
}

checkPermission();

/** Matches the `%key%` template syntax used in options.html. */
const TEMPLATE_RE = /%(\w+)%/g;
/** Matches every char that has special meaning inside a RegExp pattern. */
const REGEX_META_RE = /[.*+?^${}()|[\]\\]/g;
/** Backslash-escapes regex metacharacters so it can be safely used inside a `new RegExp()` pattern. */
const escapeForRegex = (s) => s.replace(REGEX_META_RE, '\\$&');

function applyI18n() {
  const root = document.getElementById("wrapper");
  if (!root) return;

  const markerRe = new RegExp(`(${Object.keys(i18nMarkers).map(escapeForRegex).join('|')})`);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  for (const textNode of textNodes) {
    const expanded = textNode.nodeValue.replace(TEMPLATE_RE, (_, key) =>
      Object.prototype.hasOwnProperty.call(i18nData, key) ? i18nData[key] : ''
    );

    if (!markerRe.test(expanded)) {
      textNode.nodeValue = expanded;
      continue;
    }

    const parent = textNode.parentNode;
    const next = textNode.nextSibling;
    parent.removeChild(textNode);
    for (const part of expanded.split(markerRe)) {
      if (i18nMarkers[part]) {
        parent.insertBefore(i18nMarkers[part](), next);
      } else if (part) {
        parent.insertBefore(document.createTextNode(part), next);
      }
    }
  }
}

function makeMarkerEl(tag, attr, text) {
  const el = document.createElement(tag);
  el.setAttribute(attr, '');
  el.textContent = text;
  return el;
}

const i18nMarkers = {
  '[REWIND_BTN]': () => makeMarkerEl('kbd', 'data-rewind-btn', '<'),
  '[FORWARD_BTN]': () => makeMarkerEl('kbd', 'data-forward-btn', '>'),
  '[REWIND_SEC]': () => makeMarkerEl('span', 'data-rewind-sec', String(defaults.rewindSec)),
  '[FORWARD_SEC]': () => makeMarkerEl('span', 'data-forward-sec', String(defaults.seekForwardSec)),
  '<br>': () => document.createElement('br'),
};

applyI18n();

function setKeyInputValue(keyObject, type) {
  const modifierShift = keyObject.shiftKey && keyObject.key !== "Shift";
  const modifierAlt = keyObject.altKey && keyObject.key !== "Alt";
  const modifierCtrl = keyObject.ctrlKey && keyObject.key !== "Control";
  const modifierMeta = keyObject.metaKey && keyObject.key !== "Meta";
  const allModifierStrings = `${modifierShift ? "Shift + " : ""}${modifierAlt ? "Alt + " : ""}${modifierCtrl ? "Ctrl + " : ""}${modifierMeta ? "Meta + " : ""}`;
  document.querySelector(`#${type}-key`).value = `${allModifierStrings}[${keyObject.code}]`;
  document.querySelector(`[data-${type}-btn]`).textContent = `${allModifierStrings}${keyObject.key} (${keyObject.code})`;
}

function modifyKey(e, type) {
  setKeyInputValue(e, type);
  keyObjects[type] = {
    key: e.key,
    code: e.code,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
  };
}

function saveOptions(e, reset = false) {
  if (!reset) {
    e.preventDefault();
  }

  browser.storage.sync.set({
    rewindSec: !reset ? document.querySelector("#rewind-seconds").value : defaults.rewindSec,
    seekForwardSec: !reset ? document.querySelector("#forward-seconds").value : defaults.seekForwardSec,
    keyObjects: !reset ? keyObjects : defaults.keyObjects
  });

  document.querySelector('[data-rewind-sec]').innerText = !reset ? document.querySelector("#rewind-seconds").value : defaults.rewindSec;
  document.querySelector('[data-forward-sec]').innerText = !reset ? document.querySelector("#forward-seconds").value : defaults.seekForwardSec;
  modifyKey(!reset ? keyObjects.rewind : defaults.keyObjects.rewind, 'rewind');
  modifyKey(!reset ? keyObjects.forward : defaults.keyObjects.forward, 'forward');

  let btn = document.querySelector(reset ? "#reset" : "#save");
  btn.textContent = `✓ ${reset ? i18nData.optionsDefaultsSaved : i18nData.optionsSaved}`;
  clearTimeout(infoMessageTimeout);
  infoMessageTimeout = setTimeout(() => {
    btn.textContent = reset ? i18nData.optionsResetToDefaults : i18nData.optionsSave;
  }, 750);
}

function restoreOptions() {
  function setCurrentChoice(result) {
    keyObjects.rewind = result.keyObjects?.rewind || defaults.keyObjects.rewind;
    keyObjects.forward = result.keyObjects?.forward || defaults.keyObjects.forward;
    document.querySelector("#rewind-seconds").value = result.rewindSec || defaults.rewindSec;
    document.querySelector("#forward-seconds").value = result.seekForwardSec || defaults.seekForwardSec;
    setKeyInputValue(keyObjects.rewind, 'rewind');
    setKeyInputValue(keyObjects.forward, 'forward');
  }

  function onError(error) {
    console.warn(`Error: ${error}`);
  }

  let getting = browser.storage.sync.get();
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("form").addEventListener("reset", (e) => saveOptions(e, true));
document.querySelector("#rewind-key").addEventListener("keydown", (e) => {
  e.preventDefault();
  modifyKey(e, 'rewind');
});
document.querySelector("#forward-key").addEventListener("keydown", (e) => {
  e.preventDefault();
  modifyKey(e, 'forward');
});
