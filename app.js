console.log("English Library V1 - Final Playback Version");


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
// 句子間隔
//
// 單位：毫秒
//
// 1000 = 1秒
// 2000 = 2秒
// 3000 = 3秒
// 5000 = 5秒
// ========================================

let sentenceInterval = 2000;


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
// 連續播放狀態
// ========================================

let isContinuousPlaying = false;


// ========================================
// 隨機播放狀態
// ========================================

let isRandomPlaying = false;


// ========================================
// 播放 Session
//
// 每次重新開始播放流程
// 就增加一個新的 Session
//
// 避免舊的 onend
// 在停止後又偷偷繼續播放
// ========================================

let playbackSession = 0;


// ========================================
// 句子間隔計時器
// ========================================

let nextPlayTimer = null;


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


    // ====================================
    // 保護目前索引
    // ====================================

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


  // ======================================
  // 只找英文語音
  // ======================================

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


  // ======================================
  // 優先使用較自然的英文語音
  // ======================================

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


  // ======================================
  // 尋找指定語音
  // ======================================

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


  // ======================================
  // 找不到指定語音
  // 使用第一個英文語音
  // ======================================

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
// 清除句子間隔計時器
// ========================================

function clearNextPlayTimer() {

  if (
    nextPlayTimer !== null
  ) {

    clearTimeout(
      nextPlayTimer
    );


    nextPlayTimer =
      null;

  }

}


// ========================================
// 停止目前語音
// ========================================

function stopSpeech() {

  // ======================================
  // 先取消句子間隔
  // ======================================

  clearNextPlayTimer();


  // ======================================
  // 讓所有舊 onend 失效
  // ======================================

  playbackSession =
    playbackSession + 1;


  // ======================================
  // 停止語音
  // ======================================

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


  // ======================================
  // 先取消目前語音
  // ======================================

  try {

    window.speechSynthesis.cancel();

  } catch (error) {

    console.error(
      "取消舊語音失敗：",
      error
    );

  }


  // ======================================
  // 取得目前播放 Session
  // ======================================

  const session =
    playbackSession;


  console.log(
    "播放：",
    text
  );


  console.log(
    "播放速度：",
    speechRate
  );


  // ======================================
  // 建立語音
  // ======================================

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
  // 語音開始
  // ======================================

  utterance.onstart =
    function () {

      // 舊 Session 不處理

      if (
        session !==
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

      // ====================================
      // 如果這是舊 Session
      // 直接忽略
      // ====================================

      if (
        session !==
        playbackSession
      ) {

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
  // 語音播放錯誤
  // ======================================

  utterance.onerror =
    function (event) {

      if (
        session !==
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

    updateIntervalButtons();

    updatePlaybackStatus();


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
  // 更新按鈕狀態
  // ======================================

  updateModeButtons();

  updateSpeedButtons();

  updateIntervalButtons();

  updatePlaybackStatus();


  console.log(
    "目前句子：",
    currentIndex + 1
  );

}


// ========================================
// 設定顯示模式
// ========================================
//
// 注意：
//
// 切換英文／中文／英＋中／盲聽
// 不會停止連續播放或隨機播放
//
// 只改變「字幕顯示方式」
//
// 如果原本正在連續播放
// 就繼續連續播放
//
// 如果原本正在隨機播放
// 就繼續隨機播放
// ========================================

function setMode(mode) {

  console.log(
    "切換模式：",
    mode
  );


  // ======================================
  // 判斷是否為有效模式
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
  // 記錄目前是否正在播放
  // ======================================

  const wasSpeaking =
    isSpeaking;


  // ======================================
  // 設定模式
  // ======================================

  showMode =
    mode;


  // ======================================
  // 只更新畫面
  //
  // 不停止語音
  // 不停止連續播放
  // 不停止隨機播放
  // ======================================

  render();


  updatePlaybackStatus();


  console.log(
    "目前顯示模式：",
    showMode
  );


  console.log(
    "連續播放：",
    isContinuousPlaying
  );


  console.log(
    "隨機播放：",
    isRandomPlaying
  );


  console.log(
    "目前語音播放：",
    wasSpeaking
  );

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
// ========================================
//
// 手動按下一句
// 立即播放
//
// 同時停止連續／隨機播放
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
  // 停止目前播放
  // ======================================

  stopSpeech();


  // ======================================
  // 手動切換
  // 停止連續／隨機播放
  // ======================================

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // ======================================
  // 下一筆
  // ======================================

  currentIndex =
    currentIndex + 1;


  if (
    currentIndex >=
    library.length
  ) {

    currentIndex =
      0;

  }


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 立即播放
  // ======================================

  speak();


  updatePlaybackStatus();

}


// ========================================
// 上一句
// ========================================
//
// 手動按上一句
// 立即播放
//
// 同時停止連續／隨機播放
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
  // 停止目前播放
  // ======================================

  stopSpeech();


  // ======================================
  // 停止連續／隨機播放
  // ======================================

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // ======================================
  // 上一筆
  // ======================================

  currentIndex =
    currentIndex - 1;


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
  // 立即播放
  // ======================================

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


  // ======================================
  // 停止目前語音
  // ======================================

  stopSpeech();


  // ======================================
  // 關閉隨機播放
  // ======================================

  isRandomPlaying =
    false;


  // ======================================
  // 開啟連續播放
  // ======================================

  isContinuousPlaying =
    true;


  // ======================================
  // 更新狀態
  // ======================================

  updatePlaybackStatus();


  // ======================================
  // 播放目前句子
  // ======================================

  speak();

}


// ========================================
// 排程下一句連續播放
// ========================================

function scheduleNextContinuous(
  session
) {

  // ======================================
  // 檢查 Session
  // ======================================

  if (
    session !==
    playbackSession
  ) {

    return;

  }


  // ======================================
  // 確認仍然是連續播放
  // ======================================

  if (
    !isContinuousPlaying
  ) {

    return;

  }


  console.log(
    "等待",
    sentenceInterval / 1000,
    "秒後播放下一句"
  );


  clearNextPlayTimer();


  nextPlayTimer =
    setTimeout(
      function () {

        // 再次檢查 Session

        if (
          session !==
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
      sentenceInterval
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


  // ======================================
  // 下一句
  // ======================================

  currentIndex =
    currentIndex + 1;


  // ======================================
  // 循環到第一句
  // ======================================

  if (
    currentIndex >=
    library.length
  ) {

    currentIndex =
      0;

  }


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 播放
  // ======================================

  speak();

}


// ========================================
// 停止連續／隨機播放
// ========================================

function stopContinuousPlay() {

  console.log(
    "⏹ 停止播放"
  );


  // ======================================
  // 先關閉自動播放狀態
  // ======================================

  isContinuousPlaying =
    false;

  isRandomPlaying =
    false;


  // ======================================
  // 停止語音
  // 同時取消間隔計時器
  // ======================================

  stopSpeech();


  // ======================================
  // 更新狀態
  // ======================================

  updatePlaybackStatus();

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


  // ======================================
  // 停止目前語音
  // ======================================

  stopSpeech();


  // ======================================
  // 關閉連續播放
  // ======================================

  isContinuousPlaying =
    false;


  // ======================================
  // 開啟隨機播放
  // ======================================

  isRandomPlaying =
    true;


  // ======================================
  // 選擇第一個隨機句子
  // ======================================

  chooseRandomSentence();


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 更新狀態
  // ======================================

  updatePlaybackStatus();


  // ======================================
  // 開始播放
  // ======================================

  speak();

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
// 排程下一個隨機句子
// ========================================

function scheduleNextRandom(
  session
) {

  // ======================================
  // 檢查 Session
  // ======================================

  if (
    session !==
    playbackSession
  ) {

    return;

  }


  // ======================================
  // 確認仍然是隨機播放
  // ======================================

  if (
    !isRandomPlaying
  ) {

    return;

  }


  console.log(
    "等待",
    sentenceInterval / 1000,
    "秒後播放隨機下一句"
  );


  clearNextPlayTimer();


  nextPlayTimer =
    setTimeout(
      function () {

        // 再次檢查 Session

        if (
          session !==
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
      sentenceInterval
    );

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


  // ======================================
  // 選擇新的隨機句子
  // ======================================

  chooseRandomSentence();


  // ======================================
  // 更新畫面
  // ======================================

  render();


  // ======================================
  // 播放
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
  // 最低 0.5
  // ======================================

  if (
    newRate < 0.5
  ) {

    speechRate =
      0.5;

  }


  // ======================================
  // 最高 1.0
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
  // 如果正在播放
  // 使用新速度重新播放
  // ======================================

  if (
    isSpeaking
  ) {

    // 保留目前播放模式

    const wasContinuous =
      isContinuousPlaying;

    const wasRandom =
      isRandomPlaying;


    // 停止目前語音
    // 但不能關閉連續／隨機狀態

    if (
      "speechSynthesis" in window
    ) {

      window.speechSynthesis.cancel();

    }


    isSpeaking =
      false;


    currentUtterance =
      null;


    // 產生新的 Session
    // 讓舊 onend 失效

    playbackSession =
      playbackSession + 1;


    // 重新播放目前句子

    if (
      wasContinuous ||
      wasRandom
    ) {

      speak();

    }

    else {

      speak();

    }

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
// 設定句子間隔
// ========================================
//
// 例如：
//
// 1秒
// 2秒
// 3秒
// 5秒
//
// 注意：
//
// 這裡的間隔是「一句播放完成後」
// 到「下一句開始播放」之間的時間
// ========================================

function setSentenceInterval(
  interval
) {

  const newInterval =
    Number(interval);


  if (
    isNaN(newInterval)
  ) {

    return;

  }


  // ======================================
  // 防止不合理數值
  // ======================================

  if (
    newInterval < 0
  ) {

    sentenceInterval =
      0;

  }

  else {

    sentenceInterval =
      newInterval;

  }


  console.log(
    "目前句子間隔：",
    sentenceInterval / 1000,
    "秒"
  );


  // ======================================
  // 更新按鈕高亮
  // ======================================

  updateIntervalButtons();


  // ======================================
  // 如果正在等待下一句
  //
  // 重新按照新的間隔計算
  // ======================================

  if (
    nextPlayTimer !== null
  ) {

    clearNextPlayTimer();


    if (
      isContinuousPlaying
    ) {

      const session =
        playbackSession;


      scheduleNextContinuous(
        session
      );

    }

    else if (
      isRandomPlaying
    ) {

      const session =
        playbackSession;


      scheduleNextRandom(
        session
      );

    }

  }

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
        sentenceInterval
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
    // 取得回應
    // ====================================

    const result =
      await response.json();


    console.log(
      "新增結果：",
      result
    );


    // ====================================
    // 檢查結果
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
    // 重新載入 Google Sheet
    // ====================================

    setTimeout(
      async function () {

        hideAddForm();


        await loadLibrary();


        // ==================================
        // 新增資料通常在最後一筆
        // ==================================

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
    // 初始化間隔按鈕
    // ====================================

    updateIntervalButtons();


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
