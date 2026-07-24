console.log("English Library V1 - Final Playback Version");


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
// 系統英文語音
// ========================================

let selectedVoice = null;


// ========================================
// 語音播放狀態
// ========================================

let isSpeaking = false;

let currentUtterance = null;


// ========================================
// 播放模式
//
// false = 一般播放
// true  = 連續播放
// ========================================

let isContinuousPlaying = false;


// ========================================
// 隨機播放
// ========================================

let isRandomPlaying = false;


// ========================================
// 播放 Session
//
// 用來避免舊語音 onend
// 在停止後又自動觸發下一句
// ========================================

let playbackSession = 0;


// ========================================
// 句子間隔時間
//
// 語音播放完成後等待多久再播放下一句
//
// 1500 = 1.5 秒
// ========================================

const CONTINUOUS_DELAY = 1500;


// ========================================
// 載入 Google Sheet
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


    library =
      data;


    console.log(
      "English Library 載入完成：",
      library.length,
      "筆"
    );


    // 載入語音

    loadVoices();


    // 保護目前索引

    if (
      library.length === 0
    ) {

      currentIndex =
        0;

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


  // 優先選擇自然英文語音

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


  // 搜尋指定語音

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
// 語音清單載入完成後重新取得
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
//
// 注意：
// 這個函式只停止「目前這一句」
//
// 不會自動關閉
// 連續播放 / 隨機播放狀態
// ========================================

function stopSpeech() {

  if (
    "speechSynthesis" in window
  ) {

    try {

      window.speechSynthesis.cancel();

    } catch (error) {

      console.error(
        "停止語音失敗：",
        error
      );

    }

  }


  isSpeaking =
    false;


  currentUtterance =
    null;


  // 每次停止都增加 Session
  // 讓舊 onend 失效

  playbackSession++;

}


// ========================================
// 完全停止連續／隨機播放
// ========================================

function stopAllPlayback() {

  console.log(
    "⏹ 完全停止播放"
  );


  // 先關閉自動播放

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // 停止語音

  stopSpeech();


  // 更新畫面

  updatePlaybackStatus();

}


// ========================================
// 播放目前句子
// ========================================

function speak() {

  if (!current) {

    console.warn(
      "目前沒有句子可以播放"
    );

    return;

  }


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


  if (
    !("speechSynthesis" in window)
  ) {

    console.warn(
      "此瀏覽器不支援語音播放"
    );

    return;

  }


  // 每次開始新的語音
  // 建立新的 Session

  playbackSession++;

  const thisSession =
    playbackSession;


  // 取消上一句

  try {

    window.speechSynthesis.cancel();

  } catch (error) {

    console.error(
      error
    );

  }


  console.log(
    "播放：",
    text
  );


  // 建立語音

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  currentUtterance =
    utterance;


  // 語言

  utterance.lang =
    "en-US";


  // 播放速度

  utterance.rate =
    speechRate;


  // 音調

  utterance.pitch =
    1;


  // 音量

  utterance.volume =
    1;


  // 指定英文語音

  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  // ======================================
  // 語音開始
  // ======================================

  utterance.onstart =
    function () {

      // 如果已經不是目前 Session
      // 直接忽略

      if (
        thisSession !==
        playbackSession
      ) {

        return;

      }


      isSpeaking =
        true;


      updatePlaybackStatus();


      console.log(
        "▶ 開始播放"
      );

    };


  // ======================================
  // 語音播放完成
  // ======================================

  utterance.onend =
    function () {

      // 如果這不是目前的播放 Session
      // 不做任何事情

      if (
        thisSession !==
        playbackSession
      ) {

        console.log(
          "忽略舊語音 onend"
        );

        return;

      }


      isSpeaking =
        false;


      currentUtterance =
        null;


      console.log(
        "⏹ 播放完成"
      );


      updatePlaybackStatus();


      // ====================================
      // 連續播放
      // ====================================

      if (
        isContinuousPlaying
      ) {

        setTimeout(
          function () {

            // 再次確認 Session

            if (
              thisSession !==
              playbackSession
            ) {

              return;

            }


            if (
              !isContinuousPlaying
            ) {

              return;

            }


            playNextContinuous();

          },
          CONTINUOUS_DELAY
        );

        return;

      }


      // ====================================
      // 隨機播放
      // ====================================

      if (
        isRandomPlaying
      ) {

        setTimeout(
          function () {

            // 再次確認 Session

            if (
              thisSession !==
              playbackSession
            ) {

              return;

            }


            if (
              !isRandomPlaying
            ) {

              return;

            }


            playNextRandom();

          },
          CONTINUOUS_DELAY
        );

      }

    };


  // ======================================
  // 語音播放錯誤
  // ======================================

  utterance.onerror =
    function (event) {

      if (
        thisSession !==
        playbackSession
      ) {

        return;

      }


      isSpeaking =
        false;


      currentUtterance =
        null;


      console.error(
        "語音播放錯誤：",
        event
      );


      updatePlaybackStatus();

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
  // 更新資料筆數
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

    updatePlaybackStatus();


    return;

  }


  // ======================================
  // 保護 Index
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


  // 更新按鈕

  updateModeButtons();

  updateSpeedButtons();

  updatePlaybackStatus();


  console.log(
    "目前句子：",
    currentIndex + 1,
    "/",
    library.length
  );

}


// ========================================
// 設定顯示模式
//
// 重要：
// 切換英文／中文／英＋中／盲聽
// 不會停止連續播放或隨機播放
// ========================================

function setMode(mode) {

  console.log(
    "切換顯示模式：",
    mode
  );


  // ======================================
  // 先確認模式是否合法
  // ======================================

  if (
    mode !== "en" &&
    mode !== "zh" &&
    mode !== "both" &&
    mode !== "listen"
  ) {

    console.warn(
      "未知模式：",
      mode
    );

    return;

  }


  // ======================================
  // 只改顯示模式
  //
  // 不停止語音
  // 不停止連續播放
  // 不停止隨機播放
  // ======================================

  showMode =
    mode;


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 如果目前沒有在播放
  // 且切換到盲聽模式
  // 才自動播放
  //
  // 如果正在連續／隨機播放
  // 不另外重新播放
  // ======================================

  if (
    showMode === "listen" &&
    !isSpeaking &&
    !isContinuousPlaying &&
    !isRandomPlaying
  ) {

    speak();

  }


  updatePlaybackStatus();

}


// ========================================
// HTML 使用
// ========================================

function changeShow(mode) {

  setMode(
    mode
  );

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
//
// 手動下一句：
// 會停止連續／隨機播放
// 並播放下一句
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


  // 手動操作
  // 關閉連續／隨機自動播放

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // 停止目前語音

  stopSpeech();


  // 下一筆

  currentIndex =
    currentIndex + 1;


  if (
    currentIndex >=
    library.length
  ) {

    currentIndex =
      0;

  }


  // 更新畫面

  render();


  // 播放

  speak();


  updatePlaybackStatus();

}


// ========================================
// 上一句
//
// 手動上一句：
// 會停止連續／隨機播放
// 並播放上一句
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


  // 手動操作
  // 關閉連續／隨機自動播放

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // 停止目前語音

  stopSpeech();


  // 上一筆

  currentIndex =
    currentIndex - 1;


  if (
    currentIndex < 0
  ) {

    currentIndex =
      library.length - 1;

  }


  // 更新畫面

  render();


  // 播放

  speak();


  updatePlaybackStatus();

}


// ========================================
// 開始連續播放
// ========================================

function startContinuousPlay() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  console.log(
    "▶️ 開始連續播放"
  );


  // 關閉隨機播放

  isRandomPlaying =
    false;


  // 開啟連續播放

  isContinuousPlaying =
    true;


  // 停止目前語音

  stopSpeech();


  // 更新狀態

  updatePlaybackStatus();


  // 播放目前句子

  speak();

}


// ========================================
// 連續播放下一句
// ========================================

function playNextContinuous() {

  if (
    !isContinuousPlaying
  ) {

    return;

  }


  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  // 下一句

  currentIndex =
    currentIndex + 1;


  // 循環到第一句

  if (
    currentIndex >=
    library.length
  ) {

    currentIndex =
      0;

  }


  // 更新畫面

  render();


  // 播放

  speak();

}


// ========================================
// 開始隨機播放
// ========================================

function startRandomPlay() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  console.log(
    "🔀 開始隨機播放"
  );


  // 關閉連續播放

  isContinuousPlaying =
    false;


  // 開啟隨機播放

  isRandomPlaying =
    true;


  // 停止目前語音

  stopSpeech();


  // 選擇隨機句子

  chooseRandomSentence();


  // 更新畫面

  render();


  // 更新狀態

  updatePlaybackStatus();


  // 播放

  speak();

}


// ========================================
// 選擇隨機句子
//
// 避免連續兩次播放同一句
// ========================================

function chooseRandomSentence() {

  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  if (
    library.length <= 1
  ) {

    currentIndex =
      0;

    return;

  }


  let randomIndex;


  do {

    randomIndex =
      Math.floor(
        Math.random() *
        library.length
      );

  }

  while (
    randomIndex ===
    currentIndex
  );


  currentIndex =
    randomIndex;

}


// ========================================
// 隨機播放下一句
// ========================================

function playNextRandom() {

  if (
    !isRandomPlaying
  ) {

    return;

  }


  if (
    !library ||
    library.length === 0
  ) {

    return;

  }


  // 選擇新的隨機句子

  chooseRandomSentence();


  // 更新畫面

  render();


  // 播放

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
    "目前播放速度：",
    speechRate
  );


  // 更新速度按鈕

  updateSpeedButtons();


  // 如果正在播放
  // 重新使用新速度播放
  //
  // 注意：
  // 不會關閉連續／隨機播放

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
        rate ===
        speechRate
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
// 更新播放狀態文字
// ========================================

function updatePlaybackStatus() {

  const status =
    document.getElementById(
      "playbackStatus"
    );


  if (!status) {

    return;

  }


  if (
    isContinuousPlaying
  ) {

    status.innerText =
      "▶️ 連續播放中";

    return;

  }


  if (
    isRandomPlaying
  ) {

    status.innerText =
      "🔀 隨機播放中";

    return;

  }


  if (
    isSpeaking
  ) {

    status.innerText =
      "🔊 播放中";

    return;

  }


  status.innerText =
    "";

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
  // 建立新增資料
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


    // ====================================
    // 取得結果
    // ====================================

    const result =
      await response.json();


    console.log(
      "新增結果：",
      result
    );


    // ====================================
    // 判斷是否成功
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
    // 顯示成功
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


        if (
          library.length > 0
        ) {

          // 新增的通常位於最後一筆

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
    // 載入系統語音
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
    // 初始化播放狀態
    // ====================================

    updatePlaybackStatus();


    // ====================================
    // 載入 Google Sheet
    // ====================================

    loadLibrary();

  };
