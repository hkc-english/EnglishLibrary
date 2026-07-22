console.log("English Library V1");

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";

let library = [];
let currentIndex = 0;
let current = null;

let showMode = "en";
let speechRate = 0.7;

let selectedVoice = null;


// ========================================
// 載入 Google Sheet 資料
// ========================================

async function loadLibrary() {

  try {

    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("API 連線失敗");
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("API 資料格式錯誤");
    }

    library = data;

    console.log(
      "成功載入：",
      library.length,
      "筆"
    );

    loadVoices();

    currentIndex = 0;

    render();

  } catch (error) {

    console.error(error);

    const english =
      document.getElementById("english");

    if (english) {

      english.innerText =
        "資料載入失敗，請重新整理頁面。";

    }

  }

}


// ========================================
// 載入裝置英文語音
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
    voices.filter(
      voice =>
        voice.lang &&
        voice.lang
          .toLowerCase()
          .startsWith("en")
    );


  if (englishVoices.length === 0) {

    return;

  }


  // 優先選擇常見英文語音
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
    const preferredName
    of preferredNames
  ) {

    const found =
      englishVoices.find(
        voice =>
          voice.name
            .toLowerCase()
            .includes(
              preferredName.toLowerCase()
            )
      );


    if (found) {

      selectedVoice = found;

      console.log(
        "目前語音：",
        found.name,
        found.lang
      );

      return;

    }

  }


  // 找不到指定語音
  // 使用第一個英文語音

  selectedVoice =
    englishVoices[0];

  console.log(
    "目前語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


// Safari / iPhone 語音清單載入
if ("speechSynthesis" in window) {

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


  current =
    library[currentIndex];


  const english =
    document.getElementById("english");

  const chinese =
    document.getElementById("chinese");


  if (!english || !chinese) {

    return;

  }


  // 先清空
  english.innerText = "";
  chinese.innerText = "";


  const englishText =
    current["英文"] || "";

  const chineseText =
    current["中文"] || "";


  // ======================================
  // 英文
  // ======================================

  if (showMode === "en") {

    english.innerText =
      englishText;

    return;

  }


  // ======================================
  // 中文
  // ======================================

  if (showMode === "zh") {

    chinese.innerText =
      chineseText;

    return;

  }


  // ======================================
  // 英＋中
  // ======================================

  if (showMode === "both") {

    english.innerText =
      englishText;

    chinese.innerText =
      chineseText;

    return;

  }


  // ======================================
  // 盲聽
  // ======================================

  if (showMode === "listen") {

    // 完全不顯示文字

    english.innerText = "";

    chinese.innerText = "";

    return;

  }

}


// ========================================
// 播放英文
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


  if (!("speechSynthesis" in window)) {

    alert(
      "你的裝置不支援語音播放。"
    );

    return;

  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang =
    "en-US";


  utterance.rate =
    speechRate;


  utterance.pitch =
    1;


  utterance.volume =
    1;


  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  speechSynthesis.speak(
    utterance
  );

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


  currentIndex++;


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
    200
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


  currentIndex--;


  if (currentIndex < 0) {

    currentIndex =
      library.length - 1;

  }


  render();


  setTimeout(
    function () {

      speak();

    },
    200
  );

}


// ========================================
// 顯示模式
// 英文 / 中文 / 英＋中 / 盲聽
// ========================================

function setMode(mode) {

  // 停止目前播放
  speechSynthesis.cancel();


  // 直接設定模式
  showMode = mode;


  // 更新畫面
  render();


  // ======================================
  // 如果選擇盲聽
  // 自動播放目前句子
  // ======================================

  if (mode === "listen") {

    setTimeout(
      function () {

        speak();

      },
      200
    );

  }

}


// ========================================
// 盲聽模式
// ========================================

function blindMode() {

  setMode("listen");

}


// ========================================
// 播放速度
// ========================================

function setSpeechRate(rate) {

  rate =
    Number(rate);


  if (isNaN(rate)) {

    return;

  }


  if (rate < 0.5) {

    rate = 0.5;

  }


  if (rate > 1.0) {

    rate = 1.0;

  }


  speechRate =
    rate;


  console.log(
    "播放速度：",
    speechRate
  );


  if (
    speechSynthesis.speaking
  ) {

    speak();

  }

}


// ========================================
// 頁面載入
// ========================================

window.onload =
  function () {

    loadVoices();

    loadLibrary();

  };
 
