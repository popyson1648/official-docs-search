import {
  getThemeSetting,
  serializeThemeCookie,
  type ThemeSetting
} from "../core/theme";

const cleanupByButton = new WeakMap<HTMLButtonElement, () => void>();

export function initializeThemeMenu(root: Document = document): void {
  const button = root.querySelector<HTMLButtonElement>("[data-theme-menu-button]");
  const menu = root.querySelector<HTMLElement>("[data-theme-menu]");
  const options = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-theme-option]")
  );
  if (!button || !menu || options.length === 0) {
    return;
  }

  cleanupByButton.get(button)?.();
  const abortController = new AbortController();
  const { signal } = abortController;
  const colorScheme = root.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  );
  const themeColors = Array.from(
    root.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"][data-theme-color]'
    )
  );

  const currentSetting = (): ThemeSetting =>
    getThemeSetting(root.documentElement.dataset.themeSetting);

  const updateMetadata = (setting: ThemeSetting): void => {
    colorScheme?.setAttribute(
      "content",
      setting === "system" ? "light dark" : `only ${setting}`
    );
    for (const meta of themeColors) {
      const metaTheme = meta.dataset.themeColor;
      meta.media =
        setting === "system"
          ? `(prefers-color-scheme: ${metaTheme})`
          : metaTheme === setting
            ? "all"
            : "not all";
    }
  };

  const updateSelection = (setting: ThemeSetting): void => {
    root.documentElement.dataset.themeSetting = setting;
    for (const option of options) {
      option.setAttribute(
        "aria-checked",
        String(option.dataset.themeOption === setting)
      );
    }
    updateMetadata(setting);
  };

  const closeMenu = (restoreFocus = false): void => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
      button.focus();
    }
  };

  const focusOption = (index: number): void => {
    options[(index + options.length) % options.length]?.focus();
  };

  const openMenu = (focus: "selected" | "first" | "last" = "selected"): void => {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    const selectedIndex = options.findIndex(
      (option) => option.dataset.themeOption === currentSetting()
    );
    const index =
      focus === "first"
        ? 0
        : focus === "last"
          ? options.length - 1
          : Math.max(selectedIndex, 0);
    focusOption(index);
  };

  const choose = (setting: ThemeSetting): void => {
    updateSelection(setting);
    document.cookie = serializeThemeCookie(setting);
    closeMenu(true);
  };

  button.addEventListener(
    "click",
    () => {
      if (menu.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    },
    { signal }
  );
  button.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(event.key === "ArrowDown" ? "first" : "last");
      }
    },
    { signal }
  );
  menu.addEventListener(
    "click",
    (event) => {
      const option = (event.target as Element).closest<HTMLButtonElement>(
        "[data-theme-option]"
      );
      if (option) {
        choose(getThemeSetting(option.dataset.themeOption));
      }
    },
    { signal }
  );
  menu.addEventListener(
    "keydown",
    (event) => {
      const index = options.indexOf(root.activeElement as HTMLButtonElement);
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        focusOption(index + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusOption(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusOption(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusOption(options.length - 1);
      } else if (event.key === "Tab") {
        closeMenu();
      }
    },
    { signal }
  );
  root.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !menu.hidden &&
        event.target instanceof Node &&
        !menu.contains(event.target) &&
        !button.contains(event.target)
      ) {
        closeMenu();
      }
    },
    { signal }
  );
  updateSelection(currentSetting());
  button.dataset.themeMenuReady = "true";
  cleanupByButton.set(button, () => abortController.abort());
}
