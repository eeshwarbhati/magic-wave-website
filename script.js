const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const form = document.querySelector("#contact form");
const formNote = document.querySelector(".form-note");

navToggle?.addEventListener("click", () => {
  const isOpen = nav?.classList.toggle("is-open") ?? false;
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const arrival = document.querySelector("#arrival");
const dreamWorld = document.querySelector("#dream-world");
if (arrival && dreamWorld) {
  let entering = false;
  let entryTimer;
  function finishEntry(focusHeading = true) {
    clearTimeout(entryTimer);
    arrival.hidden = true;
    dreamWorld.inert = false;
    dreamWorld.removeAttribute("aria-hidden");
    document.body.classList.remove("arrival-pending", "arrival-entering");
    document.body.classList.add("world-entered");
    if (focusHeading) {
      window.scrollTo({top: 0, behavior: "instant"});
      dreamWorld.querySelector("h1")?.focus({preventScroll: true});
    }
    document.dispatchEvent(new Event("wedding:entered"));
  }
  function enterStory(event) {
    event?.preventDefault();
    if (entering) return;
    entering = true;
    document.body.classList.add("arrival-entering");
    if (reducedMotion.matches) finishEntry();
    else entryTimer = setTimeout(finishEntry, 1300);
  }
  if (location.hash) finishEntry(false);
  else {
    document.body.classList.add("arrival-pending");
    dreamWorld.inert = true;
    dreamWorld.setAttribute("aria-hidden", "true");
  }
  arrival.querySelectorAll('a[href="#dream-world"]').forEach(link => link.addEventListener("click", enterStory));
  addEventListener("hashchange", () => { if (location.hash && !arrival.hidden) finishEntry(false); });
  reducedMotion.addEventListener("change", () => { if (entering && reducedMotion.matches) finishEntry(); });
}

const progress = document.createElement("div");
progress.className = "scroll-progress";
progress.setAttribute("aria-hidden", "true");
document.body.append(progress);
let scrollQueued = false;
function updateScroll() {
  const distance = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${distance > 0 ? scrollY / distance : 0})`;
  document.querySelector(".site-header")?.classList.toggle("scrolled", scrollY > 40);
  const hero = document.querySelector(".hero-media");
  const whatsapp = document.querySelector('.whatsapp-link');
  if (whatsapp) whatsapp.hidden = (document.querySelector('.hero')?.getBoundingClientRect().bottom > 0) || document.body.classList.contains('arrival-pending');
  if (hero && !reducedMotion.matches && scrollY < innerHeight) {
    hero.style.transform = `translateY(${scrollY * 0.12}px) scale(1.025)`;
  }
  scrollQueued = false;
}
addEventListener("scroll", () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
}, {passive: true});
updateScroll();

if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("pending");
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: 0.08});
  document.querySelectorAll(".section-heading, .intro > *, .service-card, .steps article, .package-list article, .content-grid article, .album-story, .overture-heading, .world-card").forEach(element => {
    element.classList.add("reveal", "pending");
    observer.observe(element);
  });
}

const gallery = document.querySelector(".gallery");
const categories = ["wedding", "wedding", "pre-wedding", "wedding", "maternity"];
const photographs = [];
function balancePhotoRows() {
  const visible = photographs.filter(photo => !photo.hidden);
  if (!visible.length) return;
  const styles = getComputedStyle(gallery);
  const gap = parseFloat(styles.gap);
  const target = parseFloat(styles.getPropertyValue("--gallery-target-height"));
  const ratios = visible.map(photo => Number(photo.style.getPropertyValue("--photo-ratio")));
  let height = target;
  // Keep the last portrait with a neighbour instead of enlarging it into a wide crop.
  for (; height > 80; height -= 5) {
    let used = 0, count = 0;
    for (const ratio of ratios) {
      const width = height * ratio;
      if (count && used + gap + width > gallery.clientWidth) { used = 0; count = 0; }
      used += (count ? gap : 0) + width;
      count++;
    }
    if (count !== 1 || ratios[ratios.length - 1] >= 1 || visible.length === 1) break;
  }
  gallery.style.setProperty("--gallery-row-height", `${height}px`);
}
gallery?.querySelectorAll("img").forEach((img, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = img.className;
  button.dataset.category = img.dataset.category || categories[index] || "wedding";
  button.setAttribute("aria-label", `Open photograph: ${img.alt}`);
  img.className = "";
  img.loading = "lazy";
  img.parentNode.insertBefore(button, img);
  button.append(img);
  function updatePhotoRatio() {
    const width = img.naturalWidth || Number(img.getAttribute("width"));
    const height = img.naturalHeight || Number(img.getAttribute("height"));
    button.style.setProperty("--photo-ratio", width > 0 && height > 0 ? width / height : 1);
    if (gallery.classList.contains("justified")) balancePhotoRows();
  }
  updatePhotoRatio();
  img.addEventListener("load", updatePhotoRatio);
  photographs.push(button);
});
if (photographs.length) {
  gallery.classList.add("justified");
  balancePhotoRows();
  if ("ResizeObserver" in window) {
    let lastWidth = gallery.clientWidth;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - lastWidth) > 1) { lastWidth = width; balancePhotoRows(); }
    }).observe(gallery);
  } else addEventListener("resize", balancePhotoRows);
}
if (gallery) {
  const viewer = document.createElement("dialog");
  viewer.className = "lightbox";
  viewer.setAttribute("aria-label", "Photography viewer");
  viewer.innerHTML = '<span class="lightbox-counter"></span><button class="lightbox-play" aria-label="Play photo slideshow" title="Play photo slideshow">&#9654;</button><button class="lightbox-close" aria-label="Close viewer" title="Close viewer">&#215;</button><img alt=""><figcaption></figcaption><button class="lightbox-prev" aria-label="Previous photograph">&#8592;</button><button class="lightbox-next" aria-label="Next photograph">&#8594;</button><div class="lightbox-filmstrip" aria-label="Photograph thumbnails"></div>';
  document.body.append(viewer);
  let current = 0;
  let active = photographs;
  let playing = false;
  let viewerTimer;
  const filmstrip = viewer.querySelector(".lightbox-filmstrip");
  function stopPlayback() {
    clearTimeout(viewerTimer);
    playing = false;
    viewer.querySelector(".lightbox-play").innerHTML = "&#9654;";
    viewer.querySelector(".lightbox-play").setAttribute("aria-label", "Play photo slideshow");
  }
  function scheduleViewer() {
    clearTimeout(viewerTimer);
    if (playing && !document.hidden) viewerTimer = setTimeout(() => show(current + 1), 4500);
  }
  function show(index) {
    current = (index + active.length) % active.length;
    const original = active[current].querySelector("img");
    viewer.querySelector("img").src = original.dataset.full || original.src;
    viewer.querySelector("img").alt = original.alt;
    viewer.querySelector("figcaption").textContent = original.alt;
    viewer.querySelector(".lightbox-counter").textContent = `${current + 1} / ${active.length}`;
    [...filmstrip.children].forEach((thumbnail, i) => thumbnail.setAttribute("aria-pressed", String(i === current)));
    filmstrip.children[current]?.scrollIntoView({block: "nearest", inline: "center", behavior: "instant"});
    scheduleViewer();
  }
  photographs.forEach(button => button.addEventListener("click", () => {
    active = photographs.filter(item => !item.hidden);
    filmstrip.replaceChildren();
    active.forEach((item, index) => {
      const thumbnail = document.createElement("button");
      thumbnail.type = "button";
      thumbnail.setAttribute("aria-label", `View photograph ${index + 1}`);
      const img = item.querySelector("img");
      const preview = document.createElement("img");
      preview.src = img.dataset.full?.replace("-2000.webp", "-640.webp") || img.src;
      preview.alt = "";
      preview.loading = "lazy";
      thumbnail.append(preview);
      thumbnail.addEventListener("click", () => { stopPlayback(); show(index); });
      filmstrip.append(thumbnail);
    });
    show(active.indexOf(button));
    viewer.showModal();
    document.body.classList.add("modal-open");
  }));
  viewer.querySelector(".lightbox-close").addEventListener("click", () => viewer.close());
  viewer.querySelector(".lightbox-prev").addEventListener("click", () => show(current - 1));
  viewer.querySelector(".lightbox-next").addEventListener("click", () => show(current + 1));
  viewer.addEventListener("close", () => { stopPlayback(); document.body.classList.remove("modal-open"); });
  viewer.querySelector(".lightbox-play").addEventListener("click", () => {
    if (playing) return stopPlayback();
    playing = true;
    viewer.querySelector(".lightbox-play").innerHTML = "&#10074;&#10074;";
    viewer.querySelector(".lightbox-play").setAttribute("aria-label", "Pause photo slideshow");
    scheduleViewer();
  });
  document.addEventListener("visibilitychange", scheduleViewer);
  viewer.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); }
  });
  document.querySelectorAll("[data-filter]").forEach(filter => filter.addEventListener("click", () => {
    gallery.classList.toggle("filtered", filter.dataset.filter !== "all");
    document.querySelectorAll("[data-filter]").forEach(item => item.setAttribute("aria-pressed", String(item === filter)));
    photographs.forEach(button => { button.hidden = filter.dataset.filter !== "all" && button.dataset.category !== filter.dataset.filter; });
    balancePhotoRows();
  }));
}

const mood = document.querySelector("#shoot-mood");
const moodDescriptions = {
  natural: "Soft light, real laughter, and moments that unfold naturally.",
  cinematic: "Expressive light, sweeping locations, and a story with a film-like feel.",
  editorial: "Considered styling, architectural settings, and elegant portrait direction."
};
mood?.addEventListener("change", () => {
  document.querySelector("#mood-note").textContent = moodDescriptions[mood.value];
});

const slideshow = document.querySelector(".hero");
const slides = [...document.querySelectorAll(".hero-slide")];
if (slideshow && slides.length) {
  let currentSlide = 0;
  let paused = reducedMotion.matches;
  let changing = false;
  let inView = true;
  let timer;
  const controls = document.querySelector(".slideshow-controls");
  const pauseButton = document.querySelector(".slide-pause");
  const counter = document.querySelector(".slide-count");
  const preview = document.querySelector(".hero-preview");
  const caption = document.querySelector(".hero-caption");
  const previewButtons = slides.map((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Show photograph ${index + 1}: ${slide.querySelector("img").alt}`);
    const image = document.createElement("img");
    image.src = slide.querySelector("img").src.replace(/-(1200|2000)\.webp$/, "-640.webp");
    image.alt = "";
    image.loading = "lazy";
    button.append(image);
    button.addEventListener("click", () => changeSlide(index));
    preview?.append(button);
    return button;
  });
  function updateSelection() {
    previewButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === currentSlide)));
    if (caption) caption.textContent = slides[currentSlide].querySelector("img").alt;
  }
  updateSelection();
  function updatePause() {
    slideshow.classList.toggle("is-paused", paused);
    pauseButton.innerHTML = paused ? "&#9654;" : "&#10074;&#10074;";
    pauseButton.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
    pauseButton.title = paused ? "Play slideshow" : "Pause slideshow";
  }
  function schedule() {
    clearTimeout(timer);
    if (!document.body.classList.contains("arrival-pending") && !paused && inView && !document.hidden && !controls.contains(document.activeElement) && !preview?.contains(document.activeElement) && slides.length > 1) {
      timer = setTimeout(() => changeSlide(currentSlide + 1), 6500);
    }
  }
  async function changeSlide(index) {
    if (changing || slides.length < 2) return;
    changing = true;
    clearTimeout(timer);
    const next = (index + slides.length) % slides.length;
    try {
      const image = slides[next].querySelector("img");
      image.loading = "eager";
      await image.decode();
      slides[currentSlide].classList.remove("is-active");
      slides[currentSlide].setAttribute("aria-hidden", "true");
      slides[next].classList.add("is-active");
      slides[next].setAttribute("aria-hidden", "false");
      currentSlide = next;
      updateSelection();
      counter.textContent = `${String(next + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    } catch {
      // Keep the current photograph if the next image cannot load.
    } finally {
      changing = false;
      schedule();
    }
  }
  counter.textContent = `01 / ${String(slides.length).padStart(2, "0")}`;
  controls.hidden = slides.length < 2;
  document.querySelector(".slide-prev").addEventListener("click", () => changeSlide(currentSlide - 1));
  document.querySelector(".slide-next").addEventListener("click", () => changeSlide(currentSlide + 1));
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    updatePause();
    schedule();
  });
  preview?.addEventListener("focusin", () => clearTimeout(timer));
  preview?.addEventListener("focusout", event => {
    if (!preview.contains(event.relatedTarget)) schedule();
  });
  controls.addEventListener("focusin", () => clearTimeout(timer));
  controls.addEventListener("focusout", event => {
    if (!controls.contains(event.relatedTarget)) schedule();
  });
  controls.addEventListener("mouseenter", () => clearTimeout(timer));
  controls.addEventListener("mouseleave", schedule);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("wedding:entered", schedule);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) paused = true;
    updatePause();
    schedule();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      schedule();
    }, {threshold: 0.1}).observe(slideshow);
  }
  let touchStart;
  slideshow.addEventListener("touchstart", event => { touchStart = event.changedTouches[0]; }, {passive: true});
  slideshow.addEventListener("touchend", event => {
    if (!touchStart) return;
    const delta = event.changedTouches[0].clientX - touchStart.clientX;
    const vertical = event.changedTouches[0].clientY - touchStart.clientY;
    if (Math.abs(delta) > 65 && Math.abs(delta) > Math.abs(vertical)) changeSlide(currentSlide + (delta < 0 ? 1 : -1));
    touchStart = null;
  }, {passive: true});
  updatePause();
  schedule();
}

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (window.magicWavesStatic) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  formNote.textContent = "Sending your inquiry...";
  try {
    const data = Object.fromEntries(new FormData(form));
    if (mood) data.message = `Preferred mood: ${mood.options[mood.selectedIndex].text}. ${data.message || ""}`;
    const params = new URLSearchParams(location.search);
    data.source = ["utm_source", "utm_medium", "utm_campaign"].map(key => params.get(key) || "").join(" / ");
    const response = await fetch("/api/inquiries", {method: "POST", headers: {"Content-Type": "application/json", "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content || ""}, body: JSON.stringify(data)});
    if (!response.ok) throw new Error("Inquiry failed");
    formNote.textContent = "Thank you. Your inquiry has been received.";
    form.reset();
  } catch {
    formNote.textContent = "We couldn't send your inquiry. Please try again.";
  } finally {
    button.disabled = false;
  }
});

// Keep pointer motion on the banner only; touch and reduced-motion use the still layout.
const banner = document.querySelector(".hero");
if (banner && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let pointerFrame;
  banner.addEventListener("pointermove", event => {
    if (reducedMotion.matches || pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      const rect = banner.getBoundingClientRect();
      banner.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width - .5) * 12}px`);
      banner.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height - .5) * 8}px`);
      pointerFrame = null;
    });
  });
  function resetBanner() {
    banner.style.setProperty("--pointer-x", "0px");
    banner.style.setProperty("--pointer-y", "0px");
  }
  banner.addEventListener("pointerleave", resetBanner);
  reducedMotion.addEventListener("change", resetBanner);
}
