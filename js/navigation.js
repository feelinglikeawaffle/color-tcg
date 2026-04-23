const container = document.getElementById("screen-container");
const buttons = document.querySelectorAll(".menu-btn");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const screen = btn.dataset.screen;
    loadScreen(screen);
  });
});

async function loadScreen(name) {
  const html = await fetch(`screens/${name}.html`).then(r => r.text());
  container.innerHTML = html;
  container.classList.remove("hidden");
}

