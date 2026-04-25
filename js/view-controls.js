// ============================================
// Timetable View Controls (zoom / scroll / fullscreen)
// Shared between view.html and admin.html
// ============================================
(function () {
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const ZOOM_STEP = 10;
  const SCROLL_STEP = 240;
  let currentZoom = 100;

  function applyZoom() {
    const zoomEl = document.getElementById("timetableZoom");
    const zoomValue = document.getElementById("zoomValue");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const zoomInBtn = document.getElementById("zoomInBtn");
    if (!zoomEl) return;

    // The CSS `zoom` property reflows layout so wrapper scrollbars stay correct.
    zoomEl.style.zoom = currentZoom / 100;

    if (zoomValue) zoomValue.textContent = `${currentZoom}%`;
    if (zoomOutBtn) zoomOutBtn.disabled = currentZoom <= ZOOM_MIN;
    if (zoomInBtn) zoomInBtn.disabled = currentZoom >= ZOOM_MAX;
  }

  function setZoom(value) {
    currentZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value)));
    applyZoom();
  }

  function scrollTimetable(direction) {
    const wrapper = document.getElementById("timetableWrapper");
    if (!wrapper) return;
    wrapper.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  }

  function isFullscreenActive() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function getSection() {
    return document.querySelector(".timetable-section");
  }

  function toggleFullscreen() {
    const section = getSection();
    if (!section) return;

    const requestFs =
      section.requestFullscreen ||
      section.webkitRequestFullscreen ||
      section.msRequestFullscreen;
    const exitFs =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen;

    if (isFullscreenActive()) {
      if (exitFs) exitFs.call(document);
    } else if (requestFs) {
      const result = requestFs.call(section);
      if (result && typeof result.catch === "function") {
        result.catch(() => toggleFullscreenFallback(section));
      }
    } else {
      toggleFullscreenFallback(section);
    }
  }

  function toggleFullscreenFallback(section) {
    const isOn = section.classList.toggle("timetable-fullscreen");
    document.body.classList.toggle("timetable-fullscreen-active", isOn);
  }

  function handleFullscreenChange() {
    const section = getSection();
    if (!section) return;
    const active = !!isFullscreenActive();
    section.classList.toggle("timetable-fullscreen", active);
    document.body.classList.toggle("timetable-fullscreen-active", active);
  }

  function init() {
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const zoomValue = document.getElementById("zoomValue");
    const scrollLeftBtn = document.getElementById("scrollLeftBtn");
    const scrollRightBtn = document.getElementById("scrollRightBtn");
    const fullscreenBtn = document.getElementById("fullscreenBtn");

    if (!zoomInBtn) return; // No view controls on this page.

    zoomInBtn.addEventListener("click", () => setZoom(currentZoom + ZOOM_STEP));
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => setZoom(currentZoom - ZOOM_STEP));
    if (zoomValue) zoomValue.addEventListener("click", () => setZoom(100));
    if (scrollLeftBtn) scrollLeftBtn.addEventListener("click", () => scrollTimetable(-1));
    if (scrollRightBtn) scrollRightBtn.addEventListener("click", () => scrollTimetable(1));
    if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullscreen);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    applyZoom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
