const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";

let library = [];
let current = null;

let showMode = "en";
let playMode = "normal";

async function loadLibrary() {
  const res = await fetch(API_URL);
  library = await res.json();

  document.getElementById("count").innerText =
    `${library.length} 筆`;

  nextSentence();
}

function nextSentence() {
  if (library.length === 0) return;

  current =
    library[Math.floor(Math.random() * library.length)];

  render();
}

function render() {
  const english = document.getElementById("english");
  const chinese = document.getElementById("chinese");

  if (playMode === "blind") {
    english.innerText = "";
    chinese.innerText = "";
    return;
  }

  if (showMode === "en") {
    english.innerText = current["英文"];
    chinese.innerText = "";
  }

  if (showMode === "zh") {
    english.innerText = "";
    chinese.innerText = current["中文"];
  }

  if (showMode === "both") {
    english.innerText = current["英文"];
    chinese.innerText = current["中文"];
  }
}

function speak() {
  if (!current) return;

  const u = new SpeechSynthesisUtterance(current["英文"]);
  u.lang = "en-US";
  u.rate = 0.9;

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function changeShow(mode) {
  showMode = mode;
  playMode = "normal";
  render();
}

function blindMode() {
  playMode = "blind";
  render();
}

window.onload = loadLibrary;
