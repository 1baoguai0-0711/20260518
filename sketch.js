let handpose;
let video;
let predictions = [];
let gameState = "START_WAITING"; // START_WAITING, WAITING, COUNTING, RESULT, CHOOSING, FINISHED
let timer = 3;
let lastTime = 0;
let playerGesture = "";
let computerGesture = "";
let resultMessage = "";
const gestures = ["石頭", "剪刀", "布"];

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(640, 480); // 保持內部偵測解析度穩定
  video.hide();

  // 初始化 Handpose 模型
  handpose = ml5.handpose(video, () => console.log("模型準備就緒！"));
  handpose.on("predict", results => {
    predictions = results;
  });

  textAlign(CENTER, CENTER);
  textSize(32);
}

function draw() {
  background('#669bbc');

  // 繪製擷取影像：置中、50% 寬高、左右顛倒（鏡像）
  let vw = width * 0.5;
  let vh = height * 0.5;
  push();
  translate(width / 2, height / 2);
  scale(-1, 1); // 左右翻轉
  imageMode(CENTER);
  image(video, 0, 0, vw, vh);

  // 繪製手部骨架連線
  if (predictions.length > 0) {
    drawSkeleton(predictions[0].landmarks, vw, vh);
  }
  pop();

  if (predictions.length > 0) {
    let currentHand = analyzeGesture(predictions[0].landmarks, predictions[0].boundingBox);
    
    if (gameState === "START_WAITING" && currentHand === "OK") {
      gameState = "WAITING";
    }

    if (gameState === "WAITING" && currentHand !== "未知") {
      playerGesture = currentHand;
      gameState = "COUNTING";
      lastTime = millis();
      timer = 3;
    }

    if (gameState === "COUNTING") {
      playerGesture = currentHand; // 更新目前玩家出的拳
      let elapsed = (millis() - lastTime) / 1000;
      timer = 3 - floor(elapsed);
      
      fill(255, 255, 0);
      text("倒數: " + (timer > 0 ? timer : "發拳！"), width / 2, height / 2);

      if (timer <= 0) {
        computerGesture = random(gestures);
        determineWinner();
        gameState = "RESULT";
        setTimeout(() => { gameState = "CHOOSING"; }, 2000); // 顯示結果2秒後進入選擇
      }
    }

    if (gameState === "CHOOSING") {
      if (currentHand === "繼續") {
        gameState = "WAITING";
        playerGesture = "";
      } else if (currentHand === "結束") {
        gameState = "FINISHED";
      }
    }
  }

  displayUI();
}

/**
 * 繪製手部骨架線條
 * @param {Array} landmarks 手部節點數據
 * @param {Number} vw 畫面上影像的寬度
 * @param {Number} vh 畫面上影像的高度
 */
function drawSkeleton(landmarks, vw, vh) {
  stroke(0, 255, 0); // 設定線條顏色為綠色
  strokeWeight(3);
  
  // 定義需要串接的五組線段編號
  const fingerLines = [
    [0, 1, 2, 3, 4],     // 大拇指
    [5, 6, 7, 8],        // 食指
    [9, 10, 11, 12],     // 中指
    [13, 14, 15, 16],    // 無名指
    [17, 18, 19, 20]     // 小指
  ];

  for (let linePoints of fingerLines) {
    for (let i = 0; i < linePoints.length - 1; i++) {
      let p1 = landmarks[linePoints[i]];
      let p2 = landmarks[linePoints[i+1]];

      // 將原始影像座標 (640x480) 映射到置中的 50% 畫布座標
      let x1 = map(p1[0], 0, 640, -vw/2, vw/2);
      let y1 = map(p1[1], 0, 480, -vh/2, vh/2);
      let x2 = map(p2[0], 0, 640, -vw/2, vw/2);
      let y2 = map(p2[1], 0, 480, -vh/2, vh/2);

      line(x1, y1, x2, y2);
    }
  }
}

function analyzeGesture(landmarks, boundingBox) {
  // 判斷手指是否伸直 (y座標越小代表越高)
  const indexUp = landmarks[8][1] < landmarks[6][1];
  const middleUp = landmarks[12][1] < landmarks[10][1];
  const ringUp = landmarks[16][1] < landmarks[14][1];
  const pinkyUp = landmarks[20][1] < landmarks[18][1];

  // 判斷大拇指 (相對於大拇指根部節點 2)
  const thumbUp = landmarks[4][1] < landmarks[2][1] - 20;
  const thumbDown = landmarks[4][1] > landmarks[2][1] + 20;

  if (!indexUp && middleUp && ringUp && pinkyUp) return "OK";
  if (indexUp && middleUp && ringUp && pinkyUp) return "布";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "剪刀";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
    if (thumbUp) return "繼續";
    if (thumbDown) return "結束";
    return "石頭";
  }
  return "未知";
}

function determineWinner() {
  if (playerGesture === computerGesture) {
    resultMessage = "平手！";
  } else if (
    (playerGesture === "石頭" && computerGesture === "剪刀") ||
    (playerGesture === "剪刀" && computerGesture === "布") ||
    (playerGesture === "布" && computerGesture === "石頭")
  ) {
    resultMessage = "恭喜勝利！";
  } else {
    resultMessage = "你輸了，再接再厲！";
  }
}

function displayUI() {
  fill(255);
  stroke(0);
  strokeWeight(4);
  
  if (gameState === "START_WAITING") {
    text("請比出 OK 手勢開始\n(中指、無名指、小拇指舉起)", width / 2, 80);
  } else if (gameState === "WAITING") {
    text("請比出手勢開始遊戲", width / 2, 50);
  } else if (gameState === "RESULT") {
    // 背景遮罩
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    
    fill(255);
    if (resultMessage === "恭喜勝利！") fill(0, 255, 0);
    if (resultMessage === "你輸了，再接再厲！") fill(255, 0, 0);
    
    text("你出: " + playerGesture, width / 2, height / 2 - 80);
    text("電腦出: " + computerGesture, width / 2, height / 2);
    textSize(48);
    text(resultMessage, width / 2, height / 2 + 60);
    textSize(32);
  } else if (gameState === "CHOOSING") {
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);
    fill(255, 255, 0);
    text("想再玩一場嗎？", width / 2, height / 2 - 40);
    fill(255);
    textSize(24);
    text("👍 大拇指朝上：繼續遊戲\n👎 大拇指朝下：結束離開", width / 2, height / 2 + 50);
  } else if (gameState === "FINISHED") {
    fill(0);
    rect(0, 0, width, height);
    fill(255, 0, 0);
    textSize(64);
    text("遊戲結束", width / 2, height / 2);
  }
  }