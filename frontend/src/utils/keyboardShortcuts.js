import paths from "./paths";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userFromStorage } from "./request";
import { TOGGLE_LLM_SELECTOR_EVENT } from "@/components/WorkspaceChat/ChatContainer/PromptInput/LLMSelector/action";

export const KEYBOARD_SHORTCUTS_HELP_EVENT = "keyboard-shortcuts-help";
export const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

// Static, navigation-free shortcuts (safe to evaluate without a router).
const STATIC_SHORTCUTS = {
  "⌘ + Shift + ?": {
    translationKey: "help",
    action: () => {
      window.dispatchEvent(
        new CustomEvent(KEYBOARD_SHORTCUTS_HELP_EVENT, {
          detail: { show: true },
        })
      );
    },
  },
  F1: {
    translationKey: "help",
    action: () => {
      window.dispatchEvent(
        new CustomEvent(KEYBOARD_SHORTCUTS_HELP_EVENT, {
          detail: { show: true },
        })
      );
    },
  },
  "⌘ + Shift + L": {
    translationKey: "showLLMSelector",
    action: () => {
      window.dispatchEvent(new Event(TOGGLE_LLM_SELECTOR_EVENT));
    },
  },
};

// Build the full shortcut map. `navigate` lets the router-driven shortcuts do
// client-side transitions instead of a full reload via window.location.href.
function buildShortcuts(navigate) {
  return {
    "⌘ + ,": {
      translationKey: "settings",
      action: () => navigate(paths.settings.interface()),
    },
    "⌘ + H": {
      translationKey: "home",
      action: () => navigate(paths.home()),
    },
    "⌘ + I": {
      translationKey: "workspaces",
      action: () => navigate(paths.settings.workspaces()),
    },
    "⌘ + K": {
      translationKey: "apiKeys",
      action: () => navigate(paths.settings.apiKeys()),
    },
    "⌘ + L": {
      translationKey: "llmPreferences",
      action: () => navigate(paths.settings.llmPreference()),
    },
    "⌘ + Shift + C": {
      translationKey: "chatSettings",
      action: () => navigate(paths.settings.chat()),
    },
    ...STATIC_SHORTCUTS,
  };
}

// Backwards-compatible export for any caller that just wants the help text /
// shape of the shortcut map (e.g. help dialogs). Navigation actions here are
// no-ops; the live actions are wired in `KeyboardShortcutWrapper`.
export const SHORTCUTS = buildShortcuts(() => {});

const modifier = isMac ? "meta" : "ctrl";

function listenersFromShortcuts(shortcutMap) {
  const map = {};
  for (const key in shortcutMap) {
    const listenerKey = key
      .replace("⌘", modifier)
      .replaceAll(" ", "")
      .toLowerCase();
    map[listenerKey] = shortcutMap[key].action;
  }
  return map;
}

// Convert keyboard event to shortcut key
function getShortcutKey(event) {
  let key = "";
  if (event.metaKey || event.ctrlKey) key += modifier + "+";
  if (event.shiftKey) key += "shift+";
  if (event.altKey) key += "alt+";

  // Handle special keys
  if (event.key === ",") key += ",";
  // Handle question mark or slash for help shortcut
  else if (event.key === "?" || event.key === "/") key += "?";
  else if (event.key === "Control")
    return ""; // Ignore Control key by itself
  else if (event.key === "Shift")
    return ""; // Ignore Shift key by itself
  else key += event.key.toLowerCase();
  return key;
}

// Initialize keyboard shortcuts. Accepts a `navigate` function so we can do
// client-side route transitions instead of full page reloads.
export function initKeyboardShortcuts(navigate) {
  const listeners = listenersFromShortcuts(buildShortcuts(navigate));

  function handleKeyDown(event) {
    const shortcutKey = getShortcutKey(event);
    if (!shortcutKey) return;

    const action = listeners[shortcutKey];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}

function useKeyboardShortcuts(navigate) {
  useEffect(() => {
    // If there is a user and the user is not an admin do not register the event listener
    // since some of the shortcuts are only available in multi-user mode as admin
    const user = userFromStorage();
    if (!!user && user?.role !== "admin") return;
    const cleanup = initKeyboardShortcuts(navigate);

    return () => cleanup();
  }, [navigate]);
  return;
}

export function KeyboardShortcutWrapper({ children }) {
  const navigate = useNavigate();
  useKeyboardShortcuts(navigate);
  return children;
}
