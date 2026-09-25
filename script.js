const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
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
