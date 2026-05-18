let handpose;
let video;
let predictions = [];
let gameState = "WAITING"; // WAITING, COUNTING, RESULT
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
  pop();

  if (predictions.length > 0) {
    let currentHand = analyzeGesture(predictions[0].landmarks);
    
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
        setTimeout(() => { gameState = "WAITING"; }, 3000); // 3秒後重置
      }
    }
  }

  displayUI();
}

function analyzeGesture(landmarks) {
  // 判斷手指是否伸直 (y座標越小代表越高)
  const indexUp = landmarks[8][1] < landmarks[6][1];
  const middleUp = landmarks[12][1] < landmarks[10][1];
  const ringUp = landmarks[16][1] < landmarks[14][1];
  const pinkyUp = landmarks[20][1] < landmarks[18][1];

  if (indexUp && middleUp && ringUp && pinkyUp) return "布";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "剪刀";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "石頭";
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
  
  if (gameState === "WAITING") {
    text("請比出手勢開始遊戲", width / 2, 50);
  } else if (gameState === "RESULT") {
    // 背景遮罩
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    
    fill(255);
    if (resultMessage === "恭喜勝利！") fill(0, 255, 0);
    if (resultMessage === "你輸了，再接再厲！") fill(255, 0, 0);
    
    text("你出: " + playerGesture, width / 2, height / 2 - 60);
    text("電腦出: " + computerGesture, width / 2, height / 2);
    textSize(48);
    text(resultMessage, width / 2, height / 2 + 80);
    textSize(32);
  }
}
