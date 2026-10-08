(function () {
  "use strict";

  const STORAGE_KEY = "tkv-lang";
  const i18n = window.TKV_I18N || {};
  const detectedOs = detectOs();
  let releaseData = null;
  let refreshShotSliderI18n = function () {};

  function detectOs() {
    const ua = navigator.userAgent || "";
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    const p = (platform + " " + ua).toLowerCase();
    if (p.includes("mac") || p.includes("iphone") || p.includes("ipad")) return "mac";
    if (p.includes("win")) return "win";
    return "other";
  }

  function getLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "vi" || saved === "en") return saved;
    return "vi";
  }

  function t(lang, key) {
    return (i18n[lang] && i18n[lang][key]) || (i18n.vi && i18n.vi[key]) || key;
  }

  /** Vietnamese path → English path by inserting `_en` before the extension. */
  function localizedImageSrc(basePath, lang) {
    if (lang !== "en") return basePath;
    return basePath.replace(/(\.[a-zA-Z0-9]+)$/, "_en$1");
  }

  function applyImages(lang) {
    document.querySelectorAll("[data-i18n-img]").forEach((img) => {
      const base = img.getAttribute("data-i18n-img");
      if (!base) return;
      const next = localizedImageSrc(base, lang);
      if (img.getAttribute("src") === next) return;

      // Fall back to Vietnamese asset if the `_en` file is missing.
      const onError = () => {
        img.removeEventListener("error", onError);
        if (img.getAttribute("src") !== base) img.setAttribute("src", base);
      };
      if (next !== base) img.addEventListener("error", onError, { once: true });
      img.setAttribute("src", next);
    });
  }

  function applyI18n(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = t(lang, key);
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = value;
      else el.textContent = value;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const spec = el.getAttribute("data-i18n-attr");
      if (!spec) return;
      spec.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(lang, key));
      });
    });

    applyImages(lang);

    const title = t(lang, "meta.title");
    const desc = t(lang, "meta.description");
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", desc);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", title);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute("content", desc);
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", lang === "en" ? "en_US" : "vi_VN");

    localStorage.setItem(STORAGE_KEY, lang);
    const menuBtn = document.getElementById("menu-toggle");
    if (menuBtn) {
      const open = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-label", t(lang, open ? "nav.menuClose" : "nav.menuOpen"));
    }
    refreshShotSliderI18n();
    if (releaseData) renderRelease(releaseData);
  }

  function formatSize(mb) {
    if (!mb || mb <= 0) return "—";
    return `~${mb} MB`;
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
    if (visible) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function wireDownloadLink(el, url) {
    if (!el) return;
    if (url) {
      el.href = url;
      el.classList.remove("is-disabled");
      el.removeAttribute("aria-disabled");
      el.removeAttribute("tabindex");
    } else {
      el.removeAttribute("href");
      el.classList.add("is-disabled");
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("tabindex", "-1");
    }
  }

  function renderRelease(data) {
    const versionEls = document.querySelectorAll("[data-version]");
    const sizeEls = document.querySelectorAll("[data-size]");
    const shaEl = document.querySelector("[data-sha]");
    const shaBox = document.getElementById("sha-box");
    const unavailable = document.querySelector("[data-unavailable]");
    const copyBtn = document.querySelector("[data-copy]");
    const winCta = document.getElementById("download-cta-win");
    const macCta = document.getElementById("download-cta-mac");
    const heroWin = document.getElementById("hero-cta-win");
    const osLabel = document.querySelector("[data-os-label]");
    const verify = document.querySelector("[data-verify]");
    const verifyWin = document.querySelector("[data-verify-win]");
    const verifyMac = document.querySelector("[data-verify-mac]");
    const releaseNote = document.querySelector("[data-release-note]");

    if (!data) {
      versionEls.forEach((el) => {
        el.textContent = "—";
      });
      sizeEls.forEach((el) => {
        el.textContent = "—";
      });
      if (unavailable) setVisible(unavailable, true);
      setVisible(shaBox, false);
      setVisible(verify, false);
      wireDownloadLink(winCta, "");
      wireDownloadLink(heroWin, "");
      setVisible(macCta, false);
      return;
    }

    versionEls.forEach((el) => {
      el.textContent = data.version ? `v${data.version}` : "—";
    });

    const win = data.windows || {};
    const mac = data.macos || {};
    const hasWin = !!(win.url && String(win.url).trim());
    const hasMac = !!(mac.url && String(mac.url).trim());
    const useMac = detectedOs === "mac" && hasMac;
    const selected = useMac ? mac : win;

    sizeEls.forEach((el) => {
      el.textContent = formatSize(selected.size_mb);
    });
    if (osLabel) osLabel.textContent = t(getLang(), useMac ? "download.metaOsMac" : "download.metaOsWin");

    if (shaEl) {
      const sha = selected.sha256 || "";
      shaEl.textContent = sha || "—";
      shaEl.dataset.value = sha;
    }
    const hasSelectedRelease = useMac ? hasMac : hasWin;
    const hasSelectedSha = hasSelectedRelease && !!selected.sha256;
    setVisible(shaBox, hasSelectedRelease);
    if (releaseNote) releaseNote.textContent = t(getLang(), useMac ? "download.noteMac" : "download.noteWin");
    if (copyBtn) setVisible(copyBtn, hasSelectedSha);
    if (unavailable) setVisible(unavailable, !hasSelectedRelease);

    wireDownloadLink(winCta, hasWin ? win.url : "");
    wireDownloadLink(heroWin, hasWin ? win.url : "");

    setVisible(macCta, hasMac);
    if (hasMac) wireDownloadLink(macCta, mac.url);
    setVisible(verify, hasWin || hasMac);
    setVisible(verifyWin, hasWin);
    setVisible(verifyMac, hasMac);

    const schema = document.getElementById("software-jsonld");
    if (schema) {
      try {
        const json = JSON.parse(schema.textContent);
        json.softwareVersion = data.version || undefined;
        json.datePublished = data.date || undefined;
        json.downloadUrl = selected.url || win.url || mac.url || undefined;
        schema.textContent = JSON.stringify(json);
      } catch (_) {
        /* Keep the original valid static schema. */
      }
    }
  }

  async function loadReleases() {
    let data = null;
    try {
      const res = await fetch("releases.json", { cache: "no-cache" });
      if (res.ok) data = await res.json();
    } catch (_) {
      /* file:// or offline */
    }
    releaseData = data;
    renderRelease(data);
  }

  function bindCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const shaEl = document.querySelector("[data-sha]");
        const value = (shaEl && (shaEl.dataset.value || shaEl.textContent)) || "";
        if (!value || value === "—") return;
        try {
          await navigator.clipboard.writeText(value.trim());
          btn.textContent = t(getLang(), "download.copied");
          setTimeout(() => {
            btn.textContent = t(getLang(), "download.copy");
          }, 1600);
        } catch (_) {
          /* ignore */
        }
      });
    });
  }

  function bindLangToggle() {
    const btn = document.getElementById("lang-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = getLang() === "vi" ? "en" : "vi";
      applyI18n(next);
    });
  }

  function bindMobileMenu() {
    const btn = document.getElementById("menu-toggle");
    const nav = document.getElementById("primary-nav");
    if (!btn || !nav) return;

    const setOpen = (open, restoreFocus) => {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", t(getLang(), open ? "nav.menuClose" : "nav.menuOpen"));
      if (!open && restoreFocus) btn.focus();
    };

    btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true", false));
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false, false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && btn.getAttribute("aria-expanded") === "true") setOpen(false, true);
    });
    document.addEventListener("click", (event) => {
      if (btn.getAttribute("aria-expanded") === "true" && !event.target.closest(".site-header")) {
        setOpen(false, false);
      }
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", (event) => {
      if (event.matches) setOpen(false, false);
    });
  }

  /**
   * Screenshot showcase: CSS scroll-snap scroller + pointer drag on scrollLeft,
   * prev/next/dots, autoplay, and native <dialog> lightbox.
   */
  function initShotSlider() {
    const root = document.getElementById("shot-slider");
    if (!root) return;

    const scroller = root.querySelector("[data-shot-scroller]");
    const slides = Array.from(root.querySelectorAll("[data-shot-slide]"));
    const dotsWrap = root.querySelector("[data-shot-dots]");
    const status = root.querySelector("[data-shot-status]");
    const lightbox = document.querySelector("[data-shot-lightbox]");
    const lbImg = lightbox && lightbox.querySelector("[data-shot-lb-img]");
    const lbClose = lightbox && lightbox.querySelector("[data-shot-lb-close]");
    const lbThumbs = lightbox && lightbox.querySelector("[data-shot-lb-thumbs]");
    const lbStage = lightbox && lightbox.querySelector(".shot-lightbox-stage");
    if (!scroller || slides.length === 0) return;

    let index = 0;
    let autoTimer = 0;
    let inView = false;
    let pausedByUser = false;
    let suppressClick = false;
    let lightboxOpen = false;

    const AUTOPLAY_MS = 4500;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionQuery.matches;

    function slideLabel(i) {
      const lang = getLang();
      const caption = t(lang, `showcase.slide${i + 1}.caption`);
      return t(lang, "showcase.slidePosition")
        .replace("{caption}", caption)
        .replace("{current}", String(i + 1))
        .replace("{total}", String(slides.length));
    }

    function syncActive(announce) {
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      if (dotsWrap) {
        dotsWrap.querySelectorAll(".shot-dot").forEach((dot, i) => {
          const active = i === index;
          dot.classList.toggle("is-active", active);
          if (active) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }
      if (status && announce) status.textContent = slideLabel(index);
    }

    function updateI18n(announce) {
      slides.forEach((slide, i) => {
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", slideLabel(i));
      });
      if (dotsWrap) {
        dotsWrap.querySelectorAll(".shot-dot").forEach((dot, i) => {
          dot.setAttribute("aria-label", slideLabel(i));
        });
      }
      if (status && announce) status.textContent = slideLabel(index);
    }

    function scrollToIndex(i, smooth) {
      const n = slides.length;
      index = ((i % n) + n) % n;
      const slide = slides[index];
      const left = slide.offsetLeft - (scroller.clientWidth - slide.clientWidth) / 2;
      scroller.scrollTo({
        left: Math.max(0, left),
        behavior: smooth && !reduceMotion ? "smooth" : "auto",
      });
      syncActive(true);
      bumpAutoplay();
    }

    function nearestIndex() {
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((slide, i) => {
        const center = slide.offsetLeft + slide.clientWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    function stopAutoplay() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = 0;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (reduceMotion || !inView || pausedByUser || document.hidden || lightboxOpen) return;
      autoTimer = window.setInterval(() => scrollToIndex(index + 1, true), AUTOPLAY_MS);
    }

    function bumpAutoplay() {
      startAutoplay();
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "shot-dot" + (i === index ? " is-active" : "");
        btn.addEventListener("click", () => {
          pausedByUser = false;
          scrollToIndex(i, true);
        });
        dotsWrap.appendChild(btn);
      });
      updateI18n(false);
    }

    function syncLightboxThumbs() {
      if (!lbThumbs) return;
      lbThumbs.querySelectorAll(".shot-lightbox-thumb").forEach((btn, i) => {
        const active = i === index;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
        if (active) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    }

    function buildLightboxThumbs() {
      if (!lbThumbs) return;
      lbThumbs.innerHTML = "";
      slides.forEach((slide, i) => {
        const srcImg = slide.querySelector("img");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "shot-lightbox-thumb" + (i === index ? " is-active" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-label", slideLabel(i));
        const thumb = document.createElement("img");
        thumb.src = srcImg ? srcImg.getAttribute("src") || "" : "";
        thumb.alt = "";
        thumb.loading = "lazy";
        thumb.decoding = "async";
        btn.appendChild(thumb);
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          showLightboxIndex(i);
        });
        lbThumbs.appendChild(btn);
      });
      syncLightboxThumbs();
    }

    function renderLightboxImage() {
      const img = slides[index].querySelector("img");
      if (!lbImg || !img) return;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || t(getLang(), `showcase.slide${index + 1}.alt`);
      syncLightboxThumbs();
    }

    function openLightbox(i) {
      if (!lightbox || !lbImg) return;
      index = ((i % slides.length) + slides.length) % slides.length;
      renderLightboxImage();
      lightboxOpen = true;
      stopAutoplay();
      try {
        if (typeof lightbox.showModal === "function") {
          if (!lightbox.open) lightbox.showModal();
        } else {
          lightbox.setAttribute("open", "");
        }
      } catch (_) {
        lightbox.setAttribute("open", "");
      }
      scrollToIndex(index, true);
      syncActive(true);
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightboxOpen = false;
      if (typeof lightbox.close === "function") lightbox.close();
      else lightbox.removeAttribute("open");
      bumpAutoplay();
    }

    function showLightboxIndex(i) {
      index = ((i % slides.length) + slides.length) % slides.length;
      renderLightboxImage();
      scrollToIndex(index, false);
      syncActive(true);
    }

    let dragging = false;
    let moved = false;
    let axis = null;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest(".shot-dot")) return;
      // Do not setPointerCapture yet — that steals click from [data-shot-open].
      dragging = true;
      moved = false;
      axis = null;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startScroll = scroller.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      stopAutoplay();
    }

    function onPointerMove(e) {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dy) > Math.abs(dx) * 1.2 ? "y" : "x";
        if (axis === "y") {
          dragging = false;
          scroller.classList.remove("is-dragging");
          bumpAutoplay();
          return;
        }
        scroller.classList.add("is-dragging");
        try {
          scroller.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      if (axis !== "x") return;
      e.preventDefault();
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      scroller.scrollLeft = startScroll - dx;
      if (Math.abs(dx) > 8) moved = true;
    }

    function onPointerUp(e) {
      if (!dragging && axis !== "x") {
        pointerId = null;
        return;
      }
      if (pointerId != null && e && e.pointerId !== pointerId) return;
      const wasDrag = axis === "x" && moved;
      dragging = false;
      scroller.classList.remove("is-dragging");
      try {
        if (e && scroller.hasPointerCapture(e.pointerId)) scroller.releasePointerCapture(e.pointerId);
      } catch (_) {}
      pointerId = null;

      if (wasDrag) {
        const flick = -velocity * 220;
        let target = nearestIndex();
        if (Math.abs(flick) > 40) target = flick > 0 ? index + 1 : index - 1;
        scrollToIndex(target, true);
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 280);
      } else {
        bumpAutoplay();
      }
      axis = null;
    }

    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove, { passive: false });
    scroller.addEventListener("pointerup", onPointerUp);
    scroller.addEventListener("pointercancel", onPointerUp);

    let scrollRaf = 0;
    scroller.addEventListener(
      "scroll",
      () => {
        if (scrollRaf || scroller.classList.contains("is-dragging")) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = 0;
          const next = nearestIndex();
          if (next !== index) {
            index = next;
            syncActive(false);
          }
        });
      },
      { passive: true }
    );

    slides.forEach((slide, i) => {
      const openBtn = slide.querySelector("[data-shot-open]");
      if (!openBtn) return;
      openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (suppressClick) return;
        openLightbox(i);
      });
    });

    scroller.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToIndex(index - 1, true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToIndex(index + 1, true);
      }
    });

    if (lightbox) {
      buildLightboxThumbs();
      if (lbClose) lbClose.addEventListener("click", (e) => {
        e.stopPropagation();
        closeLightbox();
      });
      if (lbStage) {
        lbStage.addEventListener("click", (e) => {
          if (e.target === lbStage) closeLightbox();
        });
      }
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      lightbox.addEventListener("cancel", (e) => {
        e.preventDefault();
        closeLightbox();
      });
      lightbox.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          showLightboxIndex(index - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          showLightboxIndex(index + 1);
        }
      });
    }

    root.addEventListener("mouseenter", () => {
      pausedByUser = true;
      stopAutoplay();
    });
    root.addEventListener("mouseleave", () => {
      if (!lightboxOpen) {
        pausedByUser = false;
        bumpAutoplay();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else bumpAutoplay();
    });

    const viewObserver = new IntersectionObserver(
      ([entry]) => {
        inView = !!(entry && entry.isIntersecting && entry.intersectionRatio > 0.3);
        if (inView) bumpAutoplay();
        else stopAutoplay();
      },
      { threshold: [0, 0.3, 0.6] }
    );
    viewObserver.observe(root);

    const onMotionChange = () => {
      reduceMotion = motionQuery.matches;
      if (reduceMotion) stopAutoplay();
      else bumpAutoplay();
    };
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else motionQuery.addListener(onMotionChange);

    buildDots();
    refreshShotSliderI18n = () => {
      updateI18n(false);
      buildLightboxThumbs();
      if (lightboxOpen) renderLightboxImage();
    };
    requestAnimationFrame(() => scrollToIndex(0, false));
  }

  /** Soft reveal-on-scroll for sections and cards (transform/opacity only). */
  function initRevealAnimations() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(
      document.querySelectorAll(
        ".section-head, .why-card, .step, .shot-slider, .download-copy, .download-visual, .community-copy, .community-visual, .faq-grid > *, .hero-grid > *"
      )
    );
    if (!targets.length) return;

    targets.forEach((el, i) => {
      el.classList.add("reveal");
      const delay = Math.min((i % 6) * 60, 240);
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    });

    if (reduceMotion) {
      targets.forEach((el) => el.classList.add("is-visible"));
      document.documentElement.classList.add("motion-ready");
      return;
    }

    let pending = new Set(targets);

    function reveal(el) {
      if (!pending.has(el)) return;
      el.classList.add("is-visible");
      pending.delete(el);
      io.unobserve(el);
    }

    /** Reveal anything that has entered or been scrolled past (hash jumps skip IO). */
    function flushPassed() {
      if (!pending.size) return;
      const limit = (window.innerHeight || document.documentElement.clientHeight) * 0.92;
      pending.forEach((el) => {
        if (el.getBoundingClientRect().top < limit) reveal(el);
      });
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) reveal(entry.target);
        });
      },
      { rootMargin: "40px 0px -4% 0px", threshold: 0.08 }
    );

    pending.forEach((el) => io.observe(el));
    flushPassed();

    let scrollRaf = 0;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollRaf || !pending.size) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = 0;
          flushPassed();
        });
      },
      { passive: true }
    );
    window.addEventListener("hashchange", flushPassed);
    window.addEventListener("load", flushPassed);

    // Enable hide-until-visible only after above-the-fold items are marked.
    // Double-rAF waits for initial hash scroll (e.g. #showcase) to settle.
    requestAnimationFrame(() => {
      flushPassed();
      document.documentElement.classList.add("motion-ready");
      requestAnimationFrame(flushPassed);
    });
  }

  /** Sticky header elevation while scrolling — rAF-throttled. */
  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const lang = getLang();
    applyI18n(lang);
    bindMobileMenu();
    bindLangToggle();
    bindCopyButtons();
    loadReleases();
    initShotSlider();
    initRevealAnimations();
    initHeaderScroll();
  });
})();
