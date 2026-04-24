import { updateMoneyDisplay, spendMoney, addToCollection, collection } from "./game-state.js";
import { generateCard } from "./card-generator.js";

const container = document.getElementById("screen-container");
const buttons = document.querySelectorAll(".menu-btn");

// Initialize money display
updateMoneyDisplay();

// MENU BUTTONS → LOAD SCREENS
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const screen = btn.dataset.screen;
    loadScreen(screen);
  });
});

// LOAD SCREEN HTML
export async function loadScreen(name) {
  const html = await fetch(`screens/${name}.html`).then(r => r.text());
  container.innerHTML = html;
  container.classList.remove("hidden");
  container.classList.add("active-screen");

  document.dispatchEvent(new Event("screenLoaded"));
}

// GLOBAL BACK BUTTON
window.goBack = function () {
  container.classList.add("closing");

  setTimeout(() => {
    container.classList.add("hidden");
    container.classList.remove("active-screen");
    container.classList.remove("closing");
    container.innerHTML = "";
  }, 300);
};

// PACK BUY BUTTONS
document.addEventListener("click", e => {
  if (e.target.classList.contains("pack-buy")) {
    const pack = e.target.closest(".pack").dataset.pack;
    buyPack(pack);
  }
});

// BUY PACK
function buyPack(type) {
  const cost = type === "basic" ? 100 : 150;

  if (!spendMoney(cost)) {
    alert("Not enough money!");
    return;
  }

  openPack(type);
}

// OPEN PACK → GENERATE CARDS
function openPack(type) {
  const cards = [];

  for (let i = 0; i < 5; i++) {
    const card = generateCard();
    cards.push(card);
    addToCollection(card);
  }

  showPackOpening(cards);
}

// PACK OPENING POPUP
function showPackOpening(cards) {
  const div = document.createElement("div");
  div.className = "pack-opening";

  div.innerHTML = `
    <h2>Pack Opened!</h2>
    <div id="pack-cards"></div>
    <button class="save-btn" onclick="this.parentElement.remove()">Close</button>
  `;

  document.body.appendChild(div);

  const container = div.querySelector("#pack-cards");

  cards.forEach(card => {
    const c = document.createElement("div");
    c.className = "pack-card";
    c.style.background = card.hex;
    c.title = `${card.name} (${card.rarity})`;
    container.appendChild(c);
  });
}

// POPULATE COLLECTION SCREEN
document.addEventListener("screenLoaded", () => {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;

  grid.innerHTML = "";

  collection.forEach(card => {
    const div = document.createElement("div");
    div.className = "card-placeholder";
    div.style.background = card.hex;
    div.title = `${card.name} (${card.rarity})`;
    grid.appendChild(div);
  });
});
