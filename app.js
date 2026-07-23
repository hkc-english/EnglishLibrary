console.log("English Library V1 - Clean Final");


// ========================================
// Google Apps Script API
// ========================================

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
//
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
// 目前使用的英文語音
// ========================================

let selectedVoice = null;


// ========================================
// 語音是否正在播放
// ========================================

let isSpeaking = false;


// ========================================
// 語音播放中的 utterance
// ========================================

let currentUtterance = null;


// ========================================
// 載入 Google Sheet 資料
// ========================================

async function loadLibrary() {

  try {

    console.log(
      "開始載入 English Library..."
    );


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
        "API 回傳資料格式錯誤"
      );

    }


    library = data;


    console.log(
      "English Library 載入完成：",
      library.length,
      "筆"
    );


    // 載入系統語音

    loadVoices();


    // 確保目前索引正確

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


    // 更新畫面

    render();


  } catch (error) {

    console.error(
      "English Library 載入失敗：",
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
// 載入系統英文語音
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
    window.speechSynthesis.getVoices();


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

    console.warn(
      "找不到英文語音"
    );

    return;

  }


  // 優先選擇較自然的語音

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


  // 依照優先順序搜尋

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
        "選用英文語音：",
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
    "選用英文語音：",
    selectedVoice.name,
    selectedVoice.lang
  );

}


// ========================================
// Safari / iPhone
// 語音清單載入完成
// ========================================

if (
  "speechSynthesis" in window
) {

  window.speechSynthesis.onvoiceschanged =
    function () {

      loadVoices();

    };

}


// ========================================
// 停止目前語音
// ========================================
//
// 注意：
// 這個函式只負責停止
// 不負責重新播放
// ========================================

function stopSpeech() {

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  try {

    window.speechSynthesis.cancel();

  } catch (error) {

    console.error(
      "停止語音失敗：",
      error
    );

  }


  isSpeaking =
    false;


  currentUtterance =
    null;

}


// ========================================
// 播放目前英文句子
// ========================================
//
// 重要：
// 這裡不呼叫 cancel()
// 避免 cancel() 與 speak() 互相干擾
// ========================================

function speak() {

  // 沒有目前資料

  if (!current) {

    console.warn(
      "目前沒有句子可以播放"
    );

    return;

  }


  // 取得英文

  const text =
    String(
      current["英文"] || ""
    ).trim();


  if (!text) {

    console.warn(
      "目前句子沒有英文內容"
    );

    return;

  }


  // 檢查瀏覽器支援

  if (
    !("speechSynthesis" in window)
  ) {

    console.warn(
      "此瀏覽器不支援 Speech Synthesis"
    );

    return;

  }


  console.log(
    "準備播放：",
    text
  );


  // 建立新的語音物件

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  currentUtterance =
    utterance;


  // ======================================
  // 語言
  // ======================================

  utterance.lang =
    "en-US";


  // ======================================
  // 播放速度
  // ======================================

  utterance.rate =
    speechRate;


  // ======================================
  // 音調
  // ======================================

  utterance.pitch =
    1;


  // ======================================
  // 音量
  // ======================================

  utterance.volume =
    1;


  // ======================================
  // 指定英文語音
  // ======================================

  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  // ======================================
  // 開始播放
  // ======================================

  utterance.onstart =
    function () {

      isSpeaking =
        true;


      console.log(
        "▶ 開始播放：",
        text
      );

    };


  // ======================================
  // 播放完成
  // ======================================

  utterance.onend =
    function () {

      isSpeaking =
        false;


      currentUtterance =
        null;


      console.log(
        "⏹ 播放完成"
      );

    };


  // ======================================
  // 播放錯誤
  // ======================================

  utterance.onerror =
    function (event) {

      isSpeaking =
        false;


      currentUtterance =
        null;


      console.error(
        "❌ 語音播放錯誤：",
        event
      );

    };


  // ======================================
  // 開始播放
  // ======================================

  window.speechSynthesis.speak(
    utterance
  );

}


// ========================================
// 顯示目前句子
// ========================================

function render() {

  // ======================================
  // 更新筆數
  // ======================================

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


  // ======================================
  // 沒有資料
  // ======================================

  if (
    !library ||
    library.length === 0
  ) {

    current =
      null;


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


    updateModeButtons();

    updateSpeedButtons();


    return;

  }


  // ======================================
  // 保護 index
  // ======================================

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

    currentIndex =
      0;

  }


  // ======================================
  // 取得目前資料
  // ======================================

  current =
    library[currentIndex];


  // ======================================
  // 取得畫面元素
  // ======================================

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


  // ======================================
  // 清空
  // ======================================

  english.innerText =
    "";

  chinese.innerText =
    "";


  // ======================================
  // 取得文字
  // ======================================

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

    english.innerText =
      "";

    chinese.innerText =
      "";

  }


  // ======================================
  // 更新按鈕
  // ======================================

  updateModeButtons();

  updateSpeedButtons();


  console.log(
    "目前句子：",
    currentIndex + 1
  );

  console.log(
    "目前模式：",
    showMode
  );

}


// ========================================
// 切換顯示模式
// ========================================

function setMode(mode) {

  console.log(
    "切換模式：",
    mode
  );


  // ======================================
  // 先停止目前語音
  // ======================================

  stopSpeech();


  // ======================================
  // 設定模式
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

    console.warn(
      "未知模式：",
      mode
    );

    return;

  }


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 盲聽模式自動播放
  // ======================================

  if (
    showMode === "listen"
  ) {

    speak();

  }

}


// ========================================
// HTML 使用的模式切換函式
// ========================================

function changeShow(mode) {

  setMode(
    mode
  );

}


// ========================================
// HTML 使用的盲聽函式
// ========================================

function blindMode() {

  setMode(
    "listen"
  );

}


// ========================================
// 下一句
// ========================================
//
// 流程：
//
// 1. 停止舊語音
// 2. currentIndex + 1
// 3. 取得新的 current
// 4. 更新畫面
// 5. 播放新的英文
//
// ========================================

function nextSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  console.log(
    "➡ 下一句"
  );


  // ======================================
  // 第一步
  // 停止目前語音
  // ======================================

  stopSpeech();


  // ======================================
  // 第二步
  // 移動 index
  // ======================================

  currentIndex =
    currentIndex + 1;


  // ======================================
  // 到最後一筆
  // 回到第一筆
  // ======================================

  if (
    currentIndex >=
    library.length
  ) {

    currentIndex =
      0;

  }


  // ======================================
  // 第三步
  // 更新畫面
  //
  // render() 會同步更新 current
  // ======================================

  render();


  // ======================================
  // 第四步
  // 直接播放新的 current
  // ======================================

  speak();

}


// ========================================
// 上一句
// ========================================
//
// 流程與下一句完全相同
//
// ========================================

function previousSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  console.log(
    "⬅ 上一句"
  );


  // ======================================
  // 第一步
  // 停止目前語音
  // ======================================

  stopSpeech();


  // ======================================
  // 第二步
  // 移動 index
  // ======================================

  currentIndex =
    currentIndex - 1;


  // ======================================
  // 第一筆再往前
  // 回到最後一筆
  // ======================================

  if (
    currentIndex < 0
  ) {

    currentIndex =
      library.length - 1;

  }


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 播放新的英文
  // ======================================

  speak();

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


  // ======================================
  // 限制最低速度
  // ======================================

  if (
    newRate < 0.5
  ) {

    speechRate =
      0.5;

  }


  // ======================================
  // 限制最高速度
  // ======================================

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
    "目前播放速度：",
    speechRate
  );


  // ======================================
  // 更新速度按鈕
  // ======================================

  updateSpeedButtons();


  // ======================================
  // 如果目前正在播放
  // 使用新速度重新播放
  // ======================================

  if (
    isSpeaking
  ) {

    stopSpeech();

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
// 新增英文句子
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

    console.error(
      "找不到新增表單欄位"
    );

    return;

  }


  // ======================================
  // 取得輸入
  // ======================================

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

    action:
      "add",

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
    // 發送至 Google Apps Script
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


    // ====================================
    // 判斷結果
    // ====================================

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


    // ====================================
    // 重新載入資料
    // ====================================

    setTimeout(
      async function () {

        hideAddForm();


        await loadLibrary();


        // 顯示剛新增的最後一筆

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

    console.log(
      "English Library 啟動"
    );


    // ====================================
    // 載入語音
    // ====================================

    loadVoices();


    // ====================================
    // 初始化速度按鈕
    // ====================================

    updateSpeedButtons();


    // ====================================
    // 初始化模式按鈕
    // ====================================

    updateModeButtons();


    // ====================================
    // 載入 Google Sheet
    // ====================================

    loadLibrary();

  };
