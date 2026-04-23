const container = document.getElementById("screen-container");
const buttons = document.querySelectorAll(".menu-btn");

// Load screens when menu buttons are clicked
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const screen = btn.dataset.screen;
    loadScreen(screen);
  });
});

// Load a screen file into the container
export async function loadScreen(name) {
  const html = await fetch(`screens/${name}.html`).then(r => r.text());
  container.innerHTML = html;
  container.classList.remove("hidden");
  container.classList.add("active-screen");
}

// Back button function (must be global)
window.goBack = function () {
  container.classList.add("closing");

  setTimeout(() => {
    container.classList.add("hidden");
    container.classList.remove("active-screen");
    container.classList.remove("closing");
    container.innerHTML = "";
  }, 300);
};
