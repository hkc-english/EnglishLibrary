console.log("English Library V1");

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";


// ========================================
// 全域變數
// ========================================

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


// 系統英文語音
let selectedVoice = null;


// ========================================
// 載入資料
// ========================================

async function loadLibrary() {

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {

      throw new Error(
        "Google Sheet API 連線失敗"
      );

    }

    const data =
      await response.json();


    if (!Array.isArray(data)) {

      throw new Error(
        "API 回傳資料不是陣列"
      );

    }


    library = data;


    console.log(
      "EnglishLibrary 載入成功：",
      library.length,
      "筆"
    );


    // 載入語音
    loadVoices();


    // 從第一筆開始
    currentIndex = 0;


    // 顯示資料
    render();


  } catch (error) {

    console.error(
      "EnglishLibrary 載入失敗：",
      error
    );


    const english =
      document.getElementById(
        "english"
      );


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

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  const voices =
    speechSynthesis.getVoices();


  if (
    !voices ||
    voices.length === 0
  ) {

    return;

  }


  // 只找英文語音

  const englishVoices =
    voices.filter(
      function (voice) {

        return (
          voice.lang &&
          voice.lang
            .toLowerCase()
            .startsWith("en")
        );

      }
    );


  if (
    englishVoices.length === 0
  ) {

    return;

  }


  // 優先使用常見英文語音

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


  // 尋找較自然的語音

  for (
    let i = 0;
    i < preferredNames.length;
    i++
  ) {

    const preferredName =
      preferredNames[i];


    const found =
      englishVoices.find(
        function (voice) {

          return voice.name
            .toLowerCase()
            .includes(
              preferredName.toLowerCase()
            );

        }
      );


    if (found) {

      selectedVoice =
        found;


      console.log(
        "使用英文語音：",
        found.name,
        found.lang
      );


      return;

    }

  }


  // 如果找不到指定語音
  // 使用第一個英文語音

  selectedVoice =
    englishVoices[0];


  console.log(
    "使用英文語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


// Safari / iPhone
// 語音清單載入完成後重新取得

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

  // 沒有資料
  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  // 確保 index 不超出範圍

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


  // 取得目前資料

  current =
    library[currentIndex];


  // 取得畫面元素

  const english =
    document.getElementById(
      "english"
    );


  const chinese =
    document.getElementById(
      "chinese"
    );


  if (
    !english ||
    !chinese
  ) {

    return;

  }


  // 每次先全部清空

  english.innerText = "";

  chinese.innerText = "";


  // 取得文字

  const englishText =
    current["英文"] || "";


  const chineseText =
    current["中文"] || "";


  // ======================================
  // 英文模式
  // ======================================

  if (
    showMode === "en"
  ) {

    english.innerText =
      englishText;

  }


  // ======================================
  // 中文模式
  // ======================================

  else if (
    showMode === "zh"
  ) {

    chinese.innerText =
      chineseText;

  }


  // ======================================
  // 英＋中模式
  // ======================================

  else if (
    showMode === "both"
  ) {

    english.innerText =
      englishText;

    chinese.innerText =
      chineseText;

  }


  // ======================================
  // 盲聽模式
  // ======================================

  else if (
    showMode === "listen"
  ) {

    // 保持空白
    // 完全不顯示字幕

    english.innerText = "";

    chinese.innerText = "";

  }


  console.log(
    "目前模式：",
    showMode
  );

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


  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  // 停止之前的語音

  speechSynthesis.cancel();


  // 建立語音

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  // 英文

  utterance.lang =
    "en-US";


  // 速度

  utterance.rate =
    speechRate;


  // 音調

  utterance.pitch =
    1;


  // 音量

  utterance.volume =
    1;


  // 如果有指定語音
  // 使用指定語音

  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  // 播放

  speechSynthesis.speak(
    utterance
  );

}


// ========================================
// 設定顯示模式
// ========================================

function setMode(mode) {

  console.log(
    "切換模式：",
    mode
  );


  // 停止目前播放

  if (
    "speechSynthesis" in window
  ) {

    speechSynthesis.cancel();

  }


  // ======================================
  // 直接設定模式
  // ======================================

  if (
    mode === "en"
  ) {

    showMode =
      "en";

  }

  else if (
    mode === "zh"
  ) {

    showMode =
      "zh";

  }

  else if (
    mode === "both"
  ) {

    showMode =
      "both";

  }

  else if (
    mode === "listen"
  ) {

    showMode =
      "listen";

  }

  else {

    // 不認識的模式
    // 不做任何事情

    console.warn(
      "未知模式：",
      mode
    );

    return;

  }


  // 更新畫面

  render();


  // ======================================
  // 只有盲聽模式自動播放
  // ======================================

  if (
    showMode === "listen"
  ) {

    setTimeout(
      function () {

        speak();

      },
      250
    );

  }

}


// ========================================
// 盲聽模式
// ========================================
//
// 保留這個函式是為了相容未來使用
//
// 目前 index.html 使用的是：
// setMode('listen')
//
// 所以實際會由 setMode 處理
// ========================================

function blindMode() {

  setMode(
    "listen"
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


  // 停止目前播放

  speechSynthesis.cancel();


  // 下一筆

  currentIndex =
    currentIndex + 1;


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


  // 停止目前播放

  speechSynthesis.cancel();


  // 上一筆

  currentIndex =
    currentIndex - 1;


  // 第一筆再往前
  // 回到最後一筆

  if (
    currentIndex < 0
  ) {

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
    250
  );

}


// ========================================
// 設定播放速度
// ========================================

function setSpeechRate(rate) {

  const newRate =
    Number(rate);


  if (
    isNaN(newRate)
  ) {

    return;

  }


  // 最低 0.5

  if (
    newRate < 0.5
  ) {

    speechRate =
      0.5;

  }


  // 最高 1.0

  else if (
    newRate > 1.0
  ) {

    speechRate =
      1.0;

  }


  else {

    speechRate =
      newRate;

  }


  console.log(
    "播放速度：",
    speechRate
  );


  // 如果正在播放
  // 重新播放

  if (
    speechSynthesis.speaking
  ) {

    speak();

  }

}


// ========================================
// 網頁載入完成
// ========================================

window.onload =
  function () {

    // 先取得系統語音

    loadVoices();


    // 再載入資料

    loadLibrary();

  };
