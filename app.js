console.log("English Library V1");

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";

let library = [];
let currentIndex = 0;
let current = null;

let showMode = "en";

// 預設播放速度
let speechRate = 0.7;

let selectedVoice = null;


// ========================================
// 載入資料
// ========================================

async function loadLibrary() {

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Google Sheet API 連線失敗");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("API 回傳資料格式錯誤");
    }

    library = data;

    console.log(
      "EnglishLibrary 載入成功：",
      library.length,
      "筆"
    );

    const countElement =
      document.getElementById("count");

    if (countElement) {
      countElement.innerText =
        `${library.length} 筆`;
    }

    currentIndex = 0;

    loadVoices();

    render();

  } catch (error) {

    console.error(
      "EnglishLibrary 載入失敗：",
      error
    );

    const english =
      document.getElementById("english");

    if (english) {

      english.innerText =
        "資料載入失敗，請重新整理頁面。";

    }

  }

}


// ========================================
// 載入英文語音
// ========================================

function loadVoices() {

  if (!("speechSynthesis" in window)) {
    return;
  }

  const voices =
    speechSynthesis.getVoices();

  if (!voices || voices.length === 0) {
    return;
  }

  const englishVoices =
    voices.filter(function (voice) {

      return (
        voice.lang &&
        voice.lang
          .toLowerCase()
          .startsWith("en")
      );

    });

  if (englishVoices.length === 0) {
    return;
  }

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

  for (
    let i = 0;
    i < preferredNames.length;
    i++
  ) {

    const preferredName =
      preferredNames[i];

    const found =
      englishVoices.find(function (voice) {

        return voice.name
          .toLowerCase()
          .includes(
            preferredName.toLowerCase()
          );

      });

    if (found) {

      selectedVoice = found;

      console.log(
        "使用英文語音：",
        found.name,
        found.lang
      );

      return;

    }

  }

  selectedVoice =
    englishVoices[0];

  console.log(
    "使用英文語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


if (
  "speechSynthesis" in window
) {

  speechSynthesis.onvoiceschanged =
    function () {

      loadVoices();

    };

}


// ========================================
// 顯示目前資料
// ========================================

function render() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }

  if (
    currentIndex < 0
  ) {

    currentIndex =
      library.length - 1;

  }

  if (
    currentIndex >=
    library.length
  ) {

    currentIndex = 0;

  }

  current =
    library[currentIndex];

  const english =
    document.getElementById("english");

  const chinese =
    document.getElementById("chinese");

  if (
    !english ||
    !chinese
  ) {

    return;

  }

  english.innerText = "";

  chinese.innerText = "";

  const englishText =
    current["英文"] || "";

  const chineseText =
    current["中文"] || "";


  // 英文

  if (
    showMode === "en"
  ) {

    english.innerText =
      englishText;

  }


  // 中文

  else if (
    showMode === "zh"
  ) {

    chinese.innerText =
      chineseText;

  }


  // 英＋中

  else if (
    showMode === "both"
  ) {

    english.innerText =
      englishText;

    chinese.innerText =
      chineseText;

  }


  // 盲聽

  else if (
    showMode === "listen"
  ) {

    english.innerText = "";

    chinese.innerText = "";

  }

}


// ========================================
// 播放目前句子
// ========================================

function speak() {

  if (!current) {
    return;
  }

  const text =
    current["英文"];

  if (!text) {
    return;
  }

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  // 停止之前的播放

  speechSynthesis.cancel();


  // 建立新的語音

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  // 英文語言

  utterance.lang =
    "en-US";


  // ★ 使用目前選擇的播放速度

  utterance.rate =
    Number(speechRate);


  utterance.pitch =
    1;

  utterance.volume =
    1;


  // 使用英文語音

  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  console.log(
    "播放速度：",
    utterance.rate
  );


  // 播放

  speechSynthesis.speak(
    utterance
  );

}


// ========================================
// 英文 / 中文 / 英＋中
// ========================================

function changeShow(mode) {

  console.log(
    "切換顯示模式：",
    mode
  );

  speechSynthesis.cancel();

  showMode =
    mode;

  render();

}


// ========================================
// 盲聽
// ========================================

function blindMode() {

  console.log(
    "進入盲聽模式"
  );

  speechSynthesis.cancel();

  showMode =
    "listen";

  render();

  setTimeout(
    function () {

      speak();

    },
    250
  );

}


// ========================================
// ★ 設定播放速度
// ========================================

function setSpeechRate(rate) {

  // 直接把按鈕傳入的數字轉成數字

  speechRate =
    Number(rate);


  // 防止速度超出範圍

  if (
    speechRate < 0.5
  ) {

    speechRate =
      0.5;

  }

  if (
    speechRate > 1.0
  ) {

    speechRate =
      1.0;

  }


  console.log(
    "已選擇播放速度：",
    speechRate
  );


  // ★ 重新播放目前句子
  // 讓新的速度立即生效

  if (current) {

    speechSynthesis.cancel();

    setTimeout(
      function () {

        speak();

      },
      100
    );

  }

}


// ========================================
// 下一句
// ========================================

function nextSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }

  speechSynthesis.cancel();

  currentIndex =
    currentIndex + 1;

  if (
    currentIndex >=
    library.length
  ) {

    currentIndex = 0;

  }

  render();

  setTimeout(
    function () {

      speak();

    },
    250
  );

}


// ========================================
// 上一句
// ========================================

function previousSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }

  speechSynthesis.cancel();

  currentIndex =
    currentIndex - 1;

  if (
    currentIndex < 0
  ) {

    currentIndex =
      library.length - 1;

  }

  render();

  setTimeout(
    function () {

      speak();

    },
    250
  );

}


// ========================================
// 網頁載入
// ========================================

window.onload =
  function () {

    loadVoices();

    loadLibrary();

  };
