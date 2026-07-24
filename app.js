console.log("English Library V1 - Full Playback System");


// ========================================
// Google Apps Script API
// ========================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbzIcTcSbfJQH-TlrFmZ7fQ_QHwq99XBhkvK3CAhJC48nLMz5gD6ScBNYT1PZNNSPx_Qw7A/exec";


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

let isPaused = false;

let currentUtterance = null;


// ========================================
// 連續播放
// ========================================

let isContinuousPlaying = false;


// ========================================
// 隨機播放
// ========================================

let isRandomPlaying = false;


// ========================================
// 播放間隔
//
// 預設 3 秒
// ========================================

let playbackInterval = 3000;

let playbackTimer = null;


// ========================================
// 播放代號
//
// 防止舊的 onend
// 在停止後重新觸發播放
// ========================================

let playbackSession = 0;


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


    library =
      data;


    console.log(
      "English Library 載入完成：",
      library.length,
      "筆"
    );


    // 載入系統語音

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
// 清除等待中的播放計時器
// ========================================

function clearPlaybackTimer() {

  if (
    playbackTimer !== null
  ) {

    clearTimeout(
      playbackTimer
    );


    playbackTimer =
      null;

  }

}


// ========================================
// 停止語音
//
// 只停止目前這一句
// 不直接關閉連續／隨機播放
// ========================================

function stopSpeech() {

  clearPlaybackTimer();


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


  isPaused =
    false;


  currentUtterance =
    null;


  updatePlaybackStatus();

  updatePauseButton();

}


// ========================================
// 完全停止所有播放
//
// 停止：
// 1. 目前語音
// 2. 連續播放
// 3. 隨機播放
// 4. 等待中的間隔計時器
// ========================================

function stopAllPlayback() {

  console.log(
    "⏹ 完全停止所有播放"
  );


  // 先增加播放代號
  // 讓舊的 onend 失效

  playbackSession++;


  // 關閉自動播放

  isContinuousPlaying =
    false;


  isRandomPlaying =
    false;


  // 停止語音

  stopSpeech();


  // 更新畫面狀態

  updatePlaybackStatus();

  updatePauseButton();

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
  // 先清除舊計時器

  clearPlaybackTimer();


  // 停止舊語音

  try {

    window.speechSynthesis.cancel();

  } catch (error) {

    console.error(
      error
    );

  }


  // 建立新的語音

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


  // 指定語音

  if (selectedVoice) {

    utterance.voice =
      selectedVoice;

  }


  // 記錄本次播放代號

  const session =
    playbackSession;


  // ======================================
  // 語音開始
  // ======================================

  utterance.onstart =
    function () {

      // 如果已經不是目前播放工作階段
      // 直接忽略

      if (
        session !==
        playbackSession
      ) {

        return;

      }


      isSpeaking =
        true;


      isPaused =
        false;


      updatePlaybackStatus();

      updatePauseButton();


      console.log(
        "▶ 開始播放"
      );

    };


  // ======================================
  // 語音完成
  // ======================================

  utterance.onend =
    function () {

      // 舊播放事件直接忽略

      if (
        session !==
        playbackSession
      ) {

        return;

      }


      isSpeaking =
        false;


      isPaused =
        false;


      currentUtterance =
        null;


      updatePlaybackStatus();

      updatePauseButton();


      console.log(
        "⏹ 播放完成"
      );


      // ====================================
      // 連續播放
      // ====================================

      if (
        isContinuousPlaying
      ) {

        scheduleNextContinuous(
          session
        );

        return;

      }


      // ====================================
      // 隨機播放
      // ====================================

      if (
        isRandomPlaying
      ) {

        scheduleNextRandom(
          session
        );

        return;

      }

    };


  // ======================================
  // 語音錯誤
  // ======================================

  utterance.onerror =
    function (event) {

      // 舊事件忽略

      if (
        session !==
        playbackSession
      ) {

        return;

      }


      isSpeaking =
        false;


      isPaused =
        false;


      currentUtterance =
        null;


      console.error(
        "語音播放錯誤：",
        event
      );


      updatePlaybackStatus();

      updatePauseButton();

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

    updateIntervalButtons();


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

  updateIntervalButtons();


  console.log(
    "目前句子：",
    currentIndex + 1
  );

}


// ========================================
// 設定顯示模式
//
// 注意：
// 切換英文／中文／英＋中／盲聽
// 不會停止連續播放或隨機播放
// ========================================

function setMode(mode) {

  console.log(
    "切換模式：",
    mode
  );


  // ======================================
  // 只停止目前這一句
  //
  // 不關閉連續／隨機播放
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
  // 如果原本是連續播放或隨機播放
  //
  // 切換模式後繼續播放目前句子
  // ======================================

  if (
    isContinuousPlaying ||
    isRandomPlaying
  ) {

    const session =
      playbackSession;


    setTimeout(
      function () {

        if (
          session !==
          playbackSession
        ) {

          return;

        }


        if (
          isContinuousPlaying ||
          isRandomPlaying
        ) {

          speak();

        }

      },
      150
    );


    return;

  }


  // ======================================
  // 如果單純切換到盲聽
  //
  // 自動播放目前句子
  // ======================================

  if (
    showMode === "listen"
  ) {

    setTimeout(
      function () {

        speak();

      },
      150
    );

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
// 手動按下一句
// 會停止連續／隨機播放
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


  // 停止所有自動播放

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // 停止目前語音

  stopSpeech();


  // 增加播放代號

  playbackSession++;


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

  setTimeout(
    function () {

      speak();

    },
    150
  );


  updatePlaybackStatus();

}


// ========================================
// 上一句
//
// 手動按上一句
// 會停止連續／隨機播放
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


  // 停止所有自動播放

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // 停止目前語音

  stopSpeech();


  // 增加播放代號

  playbackSession++;


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

  setTimeout(
    function () {

      speak();

    },
    150
  );


  updatePlaybackStatus();

}


// ========================================
// 暫停／繼續
// ========================================

function togglePause() {

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  // ======================================
  // 正在播放
  // → 暫停
  // ======================================

  if (
    isSpeaking &&
    !isPaused
  ) {

    try {

      window.speechSynthesis.pause();

      isPaused =
        true;


      console.log(
        "⏸ 暫停播放"
      );


      updatePlaybackStatus();

      updatePauseButton();

    } catch (error) {

      console.error(
        "暫停失敗：",
        error
      );

    }


    return;

  }


  // ======================================
  // 已暫停
  // → 繼續
  // ======================================

  if (
    isSpeaking &&
    isPaused
  ) {

    try {

      window.speechSynthesis.resume();

      isPaused =
        false;


      console.log(
        "▶️ 繼續播放"
      );


      updatePlaybackStatus();

      updatePauseButton();

    } catch (error) {

      console.error(
        "繼續播放失敗：",
        error
      );

    }

  }

}


// ========================================
// 更新暫停按鈕文字
// ========================================

function updatePauseButton() {

  const button =
    document.getElementById(
      "pauseButton"
    );


  if (!button) {

    return;

  }


  if (
    isPaused
  ) {

    button.innerText =
      "▶️ 繼續";

  }

  else {

    button.innerText =
      "⏸ 暫停";

  }

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


  // 新播放工作階段

  playbackSession++;


  // 清除等待計時器

  clearPlaybackTimer();


  // 停止目前語音

  stopSpeech();


  // 關閉隨機播放

  isRandomPlaying =
    false;


  // 開啟連續播放

  isContinuousPlaying =
    true;


  // 更新狀態

  updatePlaybackStatus();


  // 播放目前句子

  setTimeout(
    function () {

      speak();

    },
    150
  );

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


  console.log(
    "連續播放：等待",
    playbackInterval,
    "毫秒"
  );


  // 等待指定秒數

  playbackTimer =
    setTimeout(
      function () {

        playbackTimer =
          null;


        // 再次確認
        // 使用者可能已經停止播放

        if (
          !isContinuousPlaying
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

      },
      playbackInterval
    );

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


  // 新播放工作階段

  playbackSession++;


  // 清除等待計時器

  clearPlaybackTimer();


  // 停止目前語音

  stopSpeech();


  // 關閉連續播放

  isContinuousPlaying =
    false;


  // 開啟隨機播放

  isRandomPlaying =
    true;


  // 選擇隨機句子

  chooseRandomSentence();


  // 更新畫面

  render();


  // 更新狀態

  updatePlaybackStatus();


  // 開始播放

  setTimeout(
    function () {

      speak();

    },
    150
  );

}


// ========================================
// 隨機選擇句子
// ========================================

function chooseRandomSentence() {

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


  console.log(
    "隨機播放：等待",
    playbackInterval,
    "毫秒"
  );


  // 等待設定的間隔

  playbackTimer =
    setTimeout(
      function () {

        playbackTimer =
          null;


        // 確認仍然是隨機播放

        if (
          !isRandomPlaying
        ) {

          return;

        }


        // 選擇新的隨機句子

        chooseRandomSentence();


        // 更新畫面

        render();


        // 播放

        speak();

      },
      playbackInterval
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
    "目前播放速度：",
    speechRate
  );


  // 更新速度按鈕

  updateSpeedButtons();


  // 如果正在播放
  // 重新播放目前句子

  if (
    isSpeaking &&
    !isPaused
  ) {

    const wasContinuous =
      isContinuousPlaying;

    const wasRandom =
      isRandomPlaying;


    stopSpeech();


    // 保留自動播放狀態

    isContinuousPlaying =
      wasContinuous;

    isRandomPlaying =
      wasRandom;


    setTimeout(
      function () {

        speak();

      },
      100
    );

  }

}


// ========================================
// 設定句子間隔
// ========================================

function setPlaybackInterval(interval) {

  const newInterval =
    Number(interval);


  if (
    isNaN(newInterval)
  ) {

    return;

  }


  // 最低 1 秒

  if (
    newInterval < 1000
  ) {

    playbackInterval =
      1000;

  }


  else {

    playbackInterval =
      newInterval;

  }


  console.log(
    "句子間隔：",
    playbackInterval,
    "毫秒"
  );


  // 更新間隔按鈕

  updateIntervalButtons();

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
// 更新句子間隔按鈕高亮
// ========================================

function updateIntervalButtons() {

  const buttons =
    document.querySelectorAll(
      ".interval-button"
    );


  buttons.forEach(
    function (button) {

      button.classList.remove(
        "active-interval"
      );

    }
  );


  buttons.forEach(
    function (button) {

      const interval =
        Number(
          button.dataset.interval
        );


      if (
        interval ===
        playbackInterval
      ) {

        button.classList.add(
          "active-interval"
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
// 更新播放狀態
// ========================================

function updatePlaybackStatus() {

  const status =
    document.getElementById(
      "playbackStatus"
    );


  if (!status) {

    return;

  }


  // 連續播放

  if (
    isContinuousPlaying
  ) {

    if (
      isPaused
    ) {

      status.innerText =
        "⏸ 連續播放已暫停";

    }

    else if (
      isSpeaking
    ) {

      status.innerText =
        "▶️ 連續播放中";

    }

    else {

      status.innerText =
        "⏳ 連續播放準備中";

    }


    return;

  }


  // 隨機播放

  if (
    isRandomPlaying
  ) {

    if (
      isPaused
    ) {

      status.innerText =
        "⏸ 隨機播放已暫停";

    }

    else if (
      isSpeaking
    ) {

      status.innerText =
        "🔀 隨機播放中";

    }

    else {

      status.innerText =
        "⏳ 隨機播放準備中";

    }


    return;

  }


  // 一般播放

  if (
    isSpeaking
  ) {

    if (
      isPaused
    ) {

      status.innerText =
        "⏸ 已暫停";

    }

    else {

      status.innerText =
        "🔊 播放中";

    }


    return;

  }


  // 沒有播放

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


  if (!english) {

    if (message) {

      message.innerText =
        "請輸入英文句子。";

    }

    englishInput.focus();

    return;

  }


  if (!chinese) {

    if (message) {

      message.innerText =
        "請輸入中文翻譯。";

    }

    chineseInput.focus();

    return;

  }


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


    if (message) {

      message.innerText =
        "✅ 新增成功！";

    }


    setTimeout(
      async function () {

        hideAddForm();


        await loadLibrary();


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


    // 載入語音

    loadVoices();


    // 初始化速度按鈕

    updateSpeedButtons();


    // 初始化句子間隔

    updateIntervalButtons();


    // 初始化模式按鈕

    updateModeButtons();


    // 初始化播放狀態

    updatePlaybackStatus();


    // 初始化暫停按鈕

    updatePauseButton();


    // 載入 Google Sheet

    loadLibrary();

  };
