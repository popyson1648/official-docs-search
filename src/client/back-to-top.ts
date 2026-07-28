const backToTopCleanups = new WeakMap<Document, () => void>();

export function initializeBackToTop(root: Document = document): void {
  backToTopCleanups.get(root)?.();
  backToTopCleanups.delete(root);

  const button = root.querySelector<HTMLButtonElement>("[data-back-to-top]");
  const sentinel = root.querySelector<HTMLElement>("[data-page-top-sentinel]");
  const target = root.querySelector<HTMLElement>("[data-page-top-target]");
  const view = root.defaultView;
  if (!button || !sentinel || !target || !view) return;

  const setVisible = (visible: boolean) => {
    button.hidden = !visible;
  };
  const scrollToTop = () => {
    const reduceMotion = view.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.focus({ preventScroll: true });
    view.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  };

  const Observer = (
    view as Window & {
      IntersectionObserver?: typeof IntersectionObserver;
    }
  ).IntersectionObserver;
  if (typeof Observer === "function") {
    const observer = new Observer(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    backToTopCleanups.set(root, () => {
      observer.disconnect();
      button.removeEventListener("click", scrollToTop);
    });
  } else {
    const updateVisibility = () => {
      setVisible(view.scrollY > sentinel.offsetHeight);
    };
    view.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();
    backToTopCleanups.set(root, () => {
      view.removeEventListener("scroll", updateVisibility);
      button.removeEventListener("click", scrollToTop);
    });
  }

  button.addEventListener("click", scrollToTop);
}
