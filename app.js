console.log("English Library V1");

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";

let library = [];
let currentIndex = 0;
let current = null;

let showMode = "en";
let playMode = "normal";

// 播放速度：0.5 ～ 1.0
let speechRate = 0.7;

// 優先使用較自然的英文語音
let selectedVoice = null;


// ==============================
// 載入資料
// ==============================

async function loadLibrary() {
  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("API 讀取失敗");
    }

    library = await res.json();

    if (!Array.isArray(library) || library.length === 0) {
      throw new Error("沒有讀取到資料");
    }

    const countElement = document.getElementById("count");

    if (countElement) {
      countElement.innerText = `${library.length} 筆`;
    }

    currentIndex = 0;

    selectNaturalVoice();

    render();

  } catch (error) {

    console.error(error);

    const englishElement = document.getElementById("english");

    if (englishElement) {
      englishElement.innerText =
        "資料載入失敗，請重新整理頁面。";
    }
  }
}


// ==============================
// 選擇較自然的英文語音
// ==============================

function selectNaturalVoice() {

  const voices = speechSynthesis.getVoices();

  if (!voices || voices.length === 0) {
    return;
  }

  // 優先選擇的語音名稱
  const preferredNames = [
    "Samantha",
    "Alex",
    "Karen",
    "Daniel",
    "Moira",
    "Google US English",
    "Google UK English Female",
    "Microsoft Jenny",
    "Microsoft Aria"
  ];

  // 先找指定的自然英文語音
  for (const name of preferredNames) {

    const found = voices.find(voice =>
      voice.name.includes(name) &&
      voice.lang.toLowerCase().startsWith("en")
    );

    if (found) {
      selectedVoice = found;
      console.log("使用語音：", found.name);
      return;
    }
  }

  // 如果找不到指定語音，就找英文語音
  const englishVoice = voices.find(voice =>
    voice.lang &&
    voice.lang.toLowerCase().startsWith("en")
  );

  if (englishVoice) {
    selectedVoice = englishVoice;
    console.log("使用英文語音：", englishVoice.name);
  }
}


// Safari / Mac 有時候需要等待語音清單載入
speechSynthesis.onvoiceschanged = function () {
  selectNaturalVoice();
};


// ==============================
// 顯示句子
// ==============================

function render() {

  if (!library.length) {
    return;
  }

  current = library[currentIndex];

  const english = document.getElementById("english");
  const chinese = document.getElementById("chinese");

  if (!english || !chinese) {
    return;
  }

  english.innerText = "";
  chinese.innerText = "";

  const englishText = current["英文"] || "";
  const chineseText = current["中文"] || "";

  if (showMode === "en") {

    english.innerText = englishText;

  } else if (showMode === "zh") {

    chinese.innerText = chineseText;

  } else if (showMode === "both") {

    english.innerText = englishText;
    chinese.innerText = chineseText;

  } else if (playMode === "blind") {

    english.innerText = "";
    chinese.innerText = "";
  }
}


// ==============================
// 播放英文
// ==============================

function speak() {

  if (!current) {
    return;
  }

  const text = current["英文"];

  if (!text) {
    return;
  }

  // 停止目前播放
  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  // 英文
  utterance.lang = "en-US";

  // 播放速度
  utterance.rate = speechRate;

  // 音調
  utterance.pitch = 1;

  // 音量
  utterance.volume = 1;

  // 使用自然英文語音
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  speechSynthesis.speak(utterance);
}


// ==============================
// 下一句
// 換句後自動播放
// ==============================

function nextSentence() {

  if (!library.length) {
    return;
  }

  speechSynthesis.cancel();

  currentIndex++;

  // 到最後一句後回到第一句
  if (currentIndex >= library.length) {
    currentIndex = 0;
  }

  render();

  // 自動播放下一句
  setTimeout(function () {
    speak();
  }, 150);
}


// ==============================
// 上一句
// 換句後自動播放
// ==============================

function previousSentence() {

  if (!library.length) {
    return;
  }

  speechSynthesis.cancel();

  currentIndex--;

  // 第一筆再按上一句，回到最後一句
  if (currentIndex < 0) {
    currentIndex = library.length - 1;
  }

  render();

  // 自動播放上一句
  setTimeout(function () {
    speak();
  }, 150);
}


// ==============================
// 顯示模式
// 英文 / 中文 / 英＋中
// ==============================

function setMode(mode) {

  showMode = mode;

  playMode = "normal";

  render();
}


// ==============================
// 盲聽模式
// ==============================

function blindMode() {

  showMode = "en";

  playMode = "blind";

  render();

  // 進入盲聽模式自動播放
  setTimeout(function () {
    speak();
  }, 150);
}


// ==============================
// 播放速度
// 0.5 ～ 1.0
// ==============================

function setSpeechRate(rate) {

  rate = Number(rate);

  if (isNaN(rate)) {
    return;
  }

  // 限制最低 0.5
  if (rate < 0.5) {
    rate = 0.5;
  }

  // 限制最高 1.0
  if (rate > 1.0) {
    rate = 1.0;
  }

  speechRate = rate;

  // 如果正在播放，立即用新速度重新播放
  if (speechSynthesis.speaking) {
    speak();
  }
}


// ==============================
// 頁面載入
// ==============================

window.onload = function () {

  // 先取得系統語音
  selectNaturalVoice();

  // 載入 Google Sheet 資料
  loadLibrary();

};
