console.log("English Library V1.1");

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_Hwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";


// ========================================
// 全域變數
// ========================================

let library = [];

let currentIndex = 0;

let current = null;


// ========================================
// 顯示模式
// en     = 英文
// zh     = 中文
// both   = 英＋中
// listen = 盲聽
// ========================================

let showMode = "en";


// ========================================
// 播放速度
// ========================================

let speechRate = 0.7;


// ========================================
// 系統英文語音
// ========================================

let selectedVoice = null;


// ========================================
// 載入資料
// ========================================

async function loadLibrary() {

  try {

    const response =
      await fetch(API_URL);

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


    // 確保目前 index 正確

    if (
      library.length === 0
    ) {

      currentIndex = 0;

    }

    else if (
      currentIndex >=
      library.length
    ) {

      currentIndex =
        library.length - 1;

    }


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


  selectedVoice =
    englishVoices[0];


  console.log(
    "使用英文語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


// ========================================
// Safari / iPhone 語音清單
// ========================================

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

  // 更新筆數

  const count =
    document.getElementById(
      "count"
    );


  if (count) {

    if (
      library.length === 0
    ) {

      count.innerText =
        "目前沒有資料";

    }

    else {

      count.innerText =
        "第 " +
        (currentIndex + 1) +
        " / " +
        library.length +
        " 筆";

    }

  }


  // 沒有資料

  if (
    !library ||
    library.length === 0
  ) {

    current = null;


    const english =
      document.getElementById(
        "english"
      );

    const chinese =
      document.getElementById(
        "chinese"
      );


    if (english) {

      english.innerText =
        "目前沒有英文資料";

    }


    if (chinese) {

      chinese.innerText =
        "";

    }


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


  // 清空

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

    english.innerText = "";

    chinese.innerText = "";

  }


  // 更新模式按鈕高亮

  updateModeButtons();


  // 更新速度按鈕高亮

  updateSpeedButtons();


  console.log(
    "目前模式：",
    showMode
  );

}


// ========================================
// 更新模式按鈕高亮
// ========================================

function updateModeButtons() {

  const buttons =
    document.querySelectorAll(
      ".toolbar button"
    );


  buttons.forEach(
    function (button) {

      button.classList.remove(
        "active"
      );

    }
  );


  if (
    showMode === "en"
  ) {

    if (buttons[0]) {

      buttons[0].classList.add(
        "active"
      );

    }

  }


  else if (
    showMode === "zh"
  ) {

    if (buttons[1]) {

      buttons[1].classList.add(
        "active"
      );

    }

  }


  else if (
    showMode === "both"
  ) {

    if (buttons[2]) {

      buttons[2].classList.add(
        "active"
      );

    }

  }


  else if (
    showMode === "listen"
  ) {

    if (buttons[3]) {

      buttons[3].classList.add(
        "active"
      );

    }

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


  if (
    !("speechSynthesis" in window)
  ) {

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
// 設定顯示模式
// ========================================

function setMode(mode) {

  console.log(
    "切換模式：",
    mode
  );


  if (
    "speechSynthesis" in window
  ) {

    speechSynthesis.cancel();

  }


  if (
    mode === "en"
  ) {

    showMode = "en";

  }

  else if (
    mode === "zh"
  ) {

    showMode = "zh";

  }

  else if (
    mode === "both"
  ) {

    showMode = "both";

  }

  else if (
    mode === "listen"
  ) {

    showMode = "listen";

  }

  else {

    console.warn(
      "未知模式：",
      mode
    );

    return;

  }


  render();


  // 盲聽自動播放

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
// changeShow
// ========================================
//
// index.html 使用：
// changeShow('en')
// changeShow('zh')
// changeShow('both')
// ========================================

function changeShow(mode) {

  setMode(mode);

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


  // 盲聽模式自動播放

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


  // 盲聽模式自動播放

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
    "播放速度：",
    speechRate
  );


  updateSpeedButtons();


  // 如果正在播放

  if (
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
      ".speed-button"
    );


  buttons.forEach(
    function (button) {

      button.classList.remove(
        "active-speed"
      );

    }
  );


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

    }
  );

}


// ========================================
// 顯示新增表單
// ========================================

function showAddForm() {

  const form =
    document.getElementById(
      "addForm"
    );


  const english =
    document.getElementById(
      "newEnglish"
    );


  const chinese =
    document.getElementById(
      "newChinese"
    );


  const message =
    document.getElementById(
      "addMessage"
    );


  if (form) {

    form.style.display =
      "block";

  }


  if (message) {

    message.innerText =
      "";

  }


  if (english) {

    english.value =
      "";

  }


  if (chinese) {

    chinese.value =
      "";

  }


  if (english) {

    english.focus();

  }

}


// ========================================
// 隱藏新增表單
// ========================================

function hideAddForm() {

  const form =
    document.getElementById(
      "addForm"
    );


  if (form) {

    form.style.display =
      "none";

  }

}


// ========================================
// 新增句子
// ========================================

async function addSentence() {

  const englishInput =
    document.getElementById(
      "newEnglish"
    );


  const chineseInput =
    document.getElementById(
      "newChinese"
    );


  const message =
    document.getElementById(
      "addMessage"
    );


  const saveButton =
    document.querySelector(
      ".form-buttons button:first-child"
    );


  if (
    !englishInput ||
    !chineseInput
  ) {

    return;

  }


  const english =
    englishInput.value.trim();


  const chinese =
    chineseInput.value.trim();


  // ======================================
  // 檢查英文
  // ======================================

  if (!english) {

    if (message) {

      message.innerText =
        "請輸入英文句子。";

    }

    englishInput.focus();

    return;

  }


  // ======================================
  // 檢查中文
  // ======================================

  if (!chinese) {

    if (message) {

      message.innerText =
        "請輸入中文翻譯。";

    }

    chineseInput.focus();

    return;

  }


  // ======================================
  // 顯示儲存中
  // ======================================

  if (message) {

    message.innerText =
      "正在儲存，請稍候...";

  }


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.innerText =
      "儲存中...";

  }


  // ======================================
  // 建立資料
  // ======================================

  const requestData = {

    action: "add",

    "英文":
      english,

    "中文":
      chinese,

    "類型":
      "",

    "熟悉度":
      "陌生",

    "備註":
      "",

    "標籤":
      "",

    "重點":
      ""

  };


  try {

    // ====================================
    // 傳送到 Google Apps Script
    // ====================================

    const response =
      await fetch(
        API_URL,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "text/plain;charset=utf-8"

          },

          body:
            JSON.stringify(
              requestData
            )

        }
      );


    const result =
      await response.json();


    console.log(
      "新增結果：",
      result
    );


    if (
      !result.success
    ) {

      throw new Error(
        result.error ||
        "新增資料失敗"
      );

    }


    // ====================================
    // 新增成功
    // ====================================

    if (message) {

      message.innerText =
        "✅ 新增成功！";

    }


    // 記住新資料應該在最後一筆

    currentIndex =
      library.length;


    // 關閉表單前稍微等待

    setTimeout(
      async function () {

        hideAddForm();


        // 重新載入 Google Sheet

        await loadLibrary();


        // 顯示最後新增的資料

        if (
          library.length > 0
        ) {

          currentIndex =
            library.length - 1;

          render();

        }

      },
      500
    );


  } catch (error) {

    console.error(
      "新增資料失敗：",
      error
    );


    if (message) {

      message.innerText =
        "❌ 新增失敗：" +
        error.message;

    }

  }


  finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.innerText =
        "💾 儲存";

    }

  }

}


// ========================================
// 網頁載入完成
// ========================================

window.onload =
  function () {

    // 載入系統語音

    loadVoices();


    // 初始化速度高亮

    updateSpeedButtons();


    // 載入 Google Sheet

    loadLibrary();

  };
