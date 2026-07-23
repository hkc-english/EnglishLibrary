function setSpeechRate(rate) {

  speechRate =
    Number(rate);


  // 限制播放速度範圍

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


  // 更新速度按鈕顯示

  updateSpeedButton();


  // 重新播放目前句子

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

