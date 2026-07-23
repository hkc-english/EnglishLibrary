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

  console.log("開始載入 English Library...");

  const english =
    document.getElementById("english");

  if (english) {

    english.innerText =
      "資料載入中...";

  }


  try {

    const response =
      await fetch(
        API_URL + "?t=" + Date.now(),
        {
          method: "GET",
          cache: "no-store"
        }
      );


    console.log(
      "API HTTP 狀態：",
      response.status
    );


    if (!response.ok) {

      throw new Error(
        "Google Sheet API 連線失敗：" +
        response.status
      );

    }


    const text =
      await response.text();


    console.log(
      "API 回傳資料長度：",
      text.length
    );


    if (!text) {

      throw new Error(
        "API 沒有回傳資料"
      );

    }


    let data;


    try {

      data =
        JSON.parse(text);

    } catch (jsonError) {

      console.error(
        "JSON 解析失敗：",
        text
      );

      throw new Error(
        "Google Sheet API 回傳格式錯誤"
      );

    }


    if (!Array.isArray(data)) {

      throw new Error(
        "API 回傳資料不是陣列"
      );

    }


    if (data.length === 0) {

      throw new Error(
        "Google Sheet 目前沒有資料"
      );

    }


    // ====================================
    // 成功取得資料
    // ====================================

    library =
      data;


    console.log(
      "EnglishLibrary 載入成功：",
      library.length,
      "筆"
    );


    // ====================================
    // 更新資料筆數
    // ====================================

    const count =
      document.getElementById(
        "count"
      );


    if (count) {

      count.innerText =
        library.length + " 筆";

    }


    // ====================================
    // 載入語音
    // ====================================

    loadVoices();


    // ====================================
    // 從第一筆開始
    // ====================================

    currentIndex = 0;


    // ====================================
    // 顯示第一筆
    // ====================================

    render();


  } catch (error) {

    console.error(
      "EnglishLibrary 載入失敗：",
      error
    );


    if (english) {

      english.innerText =
        "資料載入失敗";

    }


    const chinese =
      document.getElementById(
        "chinese"
      );


    if (chinese) {

      chinese.innerText =
        "請重新整理頁面";

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

    console.warn(
      "此裝置不支援語音播放"
    );

    return;

  }


  const voices =
    speechSynthesis.getVoices();


  if (
    !voices ||
    voices.length === 0
  ) {

    console.log(
      "語音清單尚未準備完成"
    );

    return;

  }


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

    console.warn(
      "找不到英文語音"
    );

    return;

  }


  // ====================================
  // 優先選擇較自然的英文語音
  // ====================================

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


  // ====================================
  // 找不到指定語音
  // 使用第一個英文語音
  // ====================================

  selectedVoice =
    englishVoices[0];


  console.log(
    "使用英文語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


// ========================================
// Safari / iPhone 語音清單更新
// ========================================

if (
  "speechSynthesis" in window
) {

  speechSynthesis.onvoiceschanged =
    function () {

      console.log(
        "語音清單已更新"
      );

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


  // ====================================
  // 保護 currentIndex
  // ====================================

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


  // ====================================
  // 取得目前資料
  // ====================================

  current =
    library[currentIndex];


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

    console.error(
      "找不到 english 或 chinese 元素"
    );

    return;

  }


  // ====================================
  // 先清空
  // ====================================

  english.innerText = "";

  chinese.innerText = "";


  // ====================================
  // 取得英文與中文
  // ====================================

  const englishText =
    current["英文"] || "";


  const chineseText =
    current["中文"] || "";


  // ====================================
  // 英文模式
  // ====================================

  if (
    showMode === "en"
  ) {

    english.innerText =
      englishText;

  }


  // ====================================
  // 中文模式
  // ====================================

  else if (
    showMode === "zh"
  ) {

    chinese.innerText =
      chineseText;

  }


  // ====================================
  // 英＋中模式
  // ====================================

  else if (
    showMode === "both"
  ) {

    english.innerText =
      englishText;

    chinese.innerText =
      chineseText;

  }


  // ====================================
  // 盲聽模式
  // ====================================

  else if (
    showMode === "listen"
  ) {

    english.innerText = "";

    chinese.innerText = "";

  }


  console.log(
    "目前資料：",
    currentIndex + 1,
    "/",
    library.length
  );


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

    alert(
      "此裝置不支援語音播放"
    );

    return;

  }


  // ====================================
  // 停止上一段語音
  // ====================================

  speechSynthesis.cancel();


  // ====================================
  // 建立語音
  // ====================================

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


  // ====================================
  // 使用指定英文語音
  // ====================================

  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  console.log(
    "播放：",
    text
  );


  console.log(
    "播放速度：",
    speechRate
  );


  // ====================================
  // 播放
  // ====================================

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


  // ====================================
  // 停止播放
  // ====================================

  if (
    "speechSynthesis" in window
  ) {

    speechSynthesis.cancel();

  }


  // ====================================
  // 設定模式
  // ====================================

  if (
    mode === "en" ||
    mode === "zh" ||
    mode === "both" ||
    mode === "listen"
  ) {

    showMode =
      mode;

  }

  else {

    console.warn(
      "未知模式：",
      mode
    );

    return;

  }


  // ====================================
  // 更新畫面
  // ====================================

  render();


  // ====================================
  // 盲聽自動播放
  // ====================================

  if (
    showMode === "listen"
  ) {

    setTimeout(
      function () {

        speak();

      },
      300
    );

  }

}


// ========================================
// 盲聽模式
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

  if (
    "speechSynthesis" in window
  ) {

    speechSynthesis.cancel();

  }


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


  // ====================================
  // 自動播放
  // ====================================

  setTimeout(
    function () {

      speak();

    },
    300
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

  if (
    "speechSynthesis" in window
  ) {

    speechSynthesis.cancel();

  }


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


  // ====================================
  // 自動播放
  // ====================================

  setTimeout(
    function () {

      speak();

    },
    300
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


  // ====================================
  // 限制速度 0.5 ～ 1.0
  // ====================================

  if (
    newRate < 0.5
  ) {

    speechRate =
      0.5;

  }

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
    "播放速度設定為：",
    speechRate
  );


  // ====================================
  // 更新速度按鈕
  // ====================================

  updateSpeedButtons();


  // ====================================
  // 如果正在播放
  // 重新播放
  // ====================================

  if (
    "speechSynthesis" in window &&
    speechSynthesis.speaking
  ) {

    speak();

  }

}


// ========================================
// 更新速度按鈕高亮
// ========================================

function updateSpeedButtons() {

  const buttons =
    document.querySelectorAll(
      ".speed-buttons button"
    );


  if (
    !buttons ||
    buttons.length === 0
  ) {

    return;

  }


  buttons.forEach(
    function (button) {

      const rate =
        Number(
          button.dataset.rate
        );


      if (
        rate === speechRate
      ) {

        button.classList.add(
          "active-speed"
        );

      }

      else {

        button.classList.remove(
          "active-speed"
        );

      }

    }
  );

}


// ========================================
// 網頁載入完成
// ========================================

window.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "English Library V1 啟動"
    );


    // ==================================
    // 載入語音
    // ==================================

    loadVoices();


    // ==================================
    // 載入 Google Sheet
    // ==================================

    loadLibrary();


    // ==================================
    // 初始化速度按鈕
    // ==================================

    updateSpeedButtons();

  }
);
