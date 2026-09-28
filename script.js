const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

const quoteRotator = document.querySelector("[data-quote-rotator]");
if (quoteRotator) {
  const slides = [...quoteRotator.querySelectorAll(".quote-slide")];
  const track = quoteRotator.querySelector(".quote-track");
  const bar = quoteRotator.querySelector(".quote-progress span");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0;

  const show = (next) => {
    const count = slides.length;
    slides[index].setAttribute("aria-hidden", "true");
    index = (next + count) % count;
    slides[index].removeAttribute("aria-hidden");
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  const play = () => {
    quoteRotator.classList.remove("is-playing");
    if (reduceMotion || document.hidden || slides.length < 2) return;
    void bar.offsetWidth;
    quoteRotator.classList.add("is-playing");
  };

  slides.forEach((slide, slideIndex) => {
    if (slideIndex !== 0) slide.setAttribute("aria-hidden", "true");
  });

  bar.addEventListener("animationend", () => {
    show(index + 1);
    play();
  });

  quoteRotator.querySelector(".quote-next").addEventListener("click", () => {
    show(index + 1);
    play();
  });

  quoteRotator.querySelector(".quote-prev").addEventListener("click", () => {
    show(index - 1);
    play();
  });

  document.addEventListener("visibilitychange", () => {
    quoteRotator.classList.toggle("is-paused", document.hidden);
    if (!document.hidden && !quoteRotator.classList.contains("is-playing")) play();
  });

  play();
}

const mainImage = document.querySelector("[data-product-main]");
document.querySelectorAll("[data-thumb]").forEach((button) => {
  button.addEventListener("click", () => {
    const src = button.getAttribute("data-thumb");
    if (mainImage && src) mainImage.src = src;
    document.querySelectorAll("[data-thumb]").forEach((item) => {
      if (item === button) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
  });
});
