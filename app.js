console.log("English Library V1");

// ==============================
// Google Apps Script API
// ==============================

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";


// ==============================
// 全域變數
// ==============================

let library = [];

let currentIndex = 0;

let current = null;

// 顯示模式
// en     = 英文
// zh     = 中文
// both   = 英＋中
// listen = 盲聽

let showMode = "en";

// 播放速度
let speechRate = 0.7;

// 目前使用的英文語音
let selectedVoice = null;


// ==============================
// 載入 Google Sheet 資料
// ==============================

async function loadLibrary() {

  try {

    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("API 連線失敗");
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("API 回傳資料格式錯誤");
    }

    library = data;

    console.log(
      "成功載入資料：",
      library.length,
      "筆"
    );

    // 載入語音
    loadVoices();

    // 顯示第一筆
    currentIndex = 0;

    render();

  } catch (error) {

    console.error(
      "資料載入錯誤：",
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


// ==============================
// 載入系統語音
// ==============================

function loadVoices() {

  const voices =
    speechSynthesis.getVoices();

  if (!voices || voices.length === 0) {

    selectedVoice = null;

    return;

  }


  // 找英文語音
  const englishVoices =
    voices.filter(voice =>

      voice.lang &&
      voice.lang
        .toLowerCase()
        .startsWith("en")

    );


  if (englishVoices.length === 0) {

    selectedVoice = null;

    return;

  }


  // 優先尋找較常見的自然英文語音
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
        "使用語音：",
        found.name,
        found.lang
      );

      return;

    }

  }


  // 找不到指定語音
  // 就使用第一個英文語音

  selectedVoice =
    englishVoices[0];

  console.log(
    "使用英文語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


// Safari / iPhone 有時候需要等語音清單載入
if ("speechSynthesis" in window) {

  speechSynthesis.onvoiceschanged =
    function () {

      loadVoices();

    };

}


// ==============================
// 顯示目前句子
// ==============================

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


  // ============================
  // 英文模式
  // ============================

  if (showMode === "en") {

    english.innerText =
      englishText;

    return;

  }


  // ============================
  // 中文模式
  // ============================

  if (showMode === "zh") {

    chinese.innerText =
      chineseText;

    return;

  }


  // ============================
  // 英＋中模式
  // ============================

  if (showMode === "both") {

    english.innerText =
      englishText;

    chinese.innerText =
      chineseText;

    return;

  }


  // ============================
  // 盲聽模式
  // ============================

  if (showMode === "listen") {

    // 故意保持空白
    english.innerText = "";

    chinese.innerText = "";

    return;

  }

}


// ==============================
// 播放英文
// ==============================

function speak() {

  if (!current) {

    return;

  }


  const text =
    current["英文"];


  if (!text) {

    return;

  }


  // 停止目前語音
  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  // 英文
  utterance.lang =
    "en-US";


  // 播放速度
  utterance.rate =
    speechRate;


  // 正常音調
  utterance.pitch =
    1;


  // 音量
  utterance.volume =
    1;


  // 使用裝置英文語音
  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  speechSynthesis.speak(
    utterance
  );

}


// ==============================
// 下一句
// ==============================

function nextSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  // 停止目前播放
  speechSynthesis.cancel();


  // 下一筆
  currentIndex++;


  // 到最後一筆
  // 回到第一筆

  if (
    currentIndex >=
    library.length
  ) {

    currentIndex = 0;

  }


  // 更新畫面
  render();


  // 自動播放
  setTimeout(
    function () {

      speak();

    },
    200
  );

}


// ==============================
// 上一句
// ==============================

function previousSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  // 停止目前播放
  speechSynthesis.cancel();


  // 上一筆
  currentIndex--;


  // 第一筆往前
  // 回到最後一筆

  if (currentIndex < 0) {

    currentIndex =
      library.length - 1;

  }


  // 更新畫面
  render();


  // 自動播放
  setTimeout(
    function () {

      speak();

    },
    200
  );

}


// ==============================
// 英文 / 中文 / 英＋中
// ==============================

function setMode(mode) {

  // 停止目前播放
  speechSynthesis.cancel();


  // 設定顯示模式
  showMode = mode;


  // 更新畫面
  render();

}


// ==============================
// 盲聽模式
// ==============================

function blindMode() {

  // 停止目前播放
  speechSynthesis.cancel();


  // 設定盲聽
  showMode = "listen";


  // 更新畫面
  render();


  // 自動播放目前句子
  setTimeout(
    function () {

      speak();

    },
    200
  );

}


// ==============================
// 設定播放速度
// ==============================

function setSpeechRate(rate) {

  rate =
    Number(rate);


  if (
    isNaN(rate)
  ) {

    return;

  }


  // 最低 0.5
  if (rate < 0.5) {

    rate = 0.5;

  }


  // 最高 1.0
  if (rate > 1.0) {

    rate = 1.0;

  }


  speechRate =
    rate;


  console.log(
    "播放速度：",
    speechRate
  );


  // 如果目前正在播放
  // 重新播放

  if (
    speechSynthesis.speaking
  ) {

    speak();

  }

}


// ==============================
// 頁面載入
// ==============================

window.onload =
  function () {

    // 載入系統語音
    loadVoices();

    // 載入 Google Sheet
    loadLibrary();

  };
