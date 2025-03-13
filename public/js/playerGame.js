/**
 * playerGame.js
 * Manages player interactions:
 * - Joining the game
 * - Displaying questions and answers
 * - Handling answer submissions and score updates
 * - Managing slide and presentation events
 */

const socket = io();
let playerAnswered = false;
let correct = false;
let score = 0;
const params = jQuery.deparam(window.location.search);

// Cache frequently used DOM elements
const answerButtons = [
  document.getElementById("answer1"),
  document.getElementById("answer2"),
  document.getElementById("answer3"),
  document.getElementById("answer4"),
];
const messageEl = document.getElementById("message");
const questionContainerEl = document.getElementById("question-container");
const questionTextEl = document.getElementById("questionText");
const nameTextEl = document.getElementById("nameText");
const scoreTextEl = document.getElementById("scoreText");

// When the player connects, join the game and show answer buttons
socket.on("connect", () => {
  socket.emit("player-join-game", params);
});

// Redirect to home if game not found
socket.on("noGameFound", () => {
  window.location.href = "../../";
});

/**
 * Called when the player selects an answer.
 * @param {number} num - Selected answer number.
 */
function answerSubmitted(num) {
  if (!playerAnswered) {
    playerAnswered = true;
    socket.emit("playerAnswer", num);
    answerButtons.forEach((btn) => {
      if (btn) btn.style.visibility = "hidden";
    });
    if (messageEl) {
      messageEl.style.display = "block";
      messageEl.innerHTML = "Answer Submitted! Waiting on other players...";
    }
  }
}

/**
 * Display a new question and ensure answer buttons are visible.
 */
socket.on("gameQuestions", data => {
  console.log("Received question:", data);

  // Show the question container
  if (questionContainerEl) questionContainerEl.style.display = "block";

  // Update question text and answer buttons, and explicitly restore visibility
  if (questionTextEl) questionTextEl.innerHTML = data.q1;
  if (answerButtons[0]) {
    answerButtons[0].innerHTML = data.a1;
    answerButtons[0].style.visibility = "visible";
  }
  if (answerButtons[1]) {
    answerButtons[1].innerHTML = data.a2;
    answerButtons[1].style.visibility = "visible";
  }
  if (answerButtons[2]) {
    answerButtons[2].innerHTML = data.a3;
    answerButtons[2].style.visibility = "visible";
  }
  if (answerButtons[3]) {
    answerButtons[3].innerHTML = data.a4;
    answerButtons[3].style.visibility = "visible";
  }

  // Hide any previous messages
  if (messageEl) messageEl.style.display = "none";
});

// Hide answer buttons when slides are being presented
socket.on("hideAnswersForPlayers", () => {
  console.log("Slides are being shown, hiding answer buttons");
  answerButtons.forEach(btn => {
    if (btn) btn.style.visibility = "hidden";
  });
});

// Show answer buttons when a question is presented
socket.on("showAnswersForPlayers", () => {
  console.log("Question is being shown, making answer buttons visible");
  answerButtons.forEach(btn => {
    if (btn) btn.style.visibility = "visible";
  });
});

// Mark answer as correct if true
socket.on("answerResult", (data) => {
  correct = data === true;
});

// When the question is over, update the background and notify players
socket.on("questionOver", () => {
  document.body.style.backgroundColor = correct ? "#4CAF50" : "#f94a1e";
  if (messageEl) {
    messageEl.style.display = "block";
    messageEl.innerHTML = correct ? "Correct!" : "Incorrect!";
  }
  answerButtons.forEach((btn) => {
    if (btn) btn.style.visibility = "hidden";
  });
  socket.emit("getScore");
});

// Update score display
socket.on("newScore", (data) => {
  console.log("Performing new score update");
  if (scoreTextEl) scoreTextEl.innerHTML = "Score: " + data;
});

// Reset UI for next question
socket.on("nextQuestionPlayer", () => {
  correct = false;
  playerAnswered = false;
  answerButtons.forEach((btn) => {
    if (btn) btn.style.visibility = "visible";
  });
  if (messageEl) messageEl.style.display = "none";
  document.body.style.backgroundColor = "white";
});

// Redirect if host disconnects
socket.on("hostDisconnect", () => {
  window.location.href = "../../";
});

// Update player-specific data (name and score)
socket.on("playerGameData", (data) => {
  data.forEach((player) => {
    if (player.playerId === socket.id) {
      if (nameTextEl) nameTextEl.innerHTML = "Name: " + player.name;
      if (scoreTextEl)
        scoreTextEl.innerHTML = "Score: " + player.gameData.score;
    }
  });
});

// Handle game over event
socket.on("GameOver", () => {
  document.body.style.backgroundColor = "#FFFFFF";
  answerButtons.forEach((btn) => {
    if (btn) btn.style.visibility = "hidden";
  });
  if (messageEl) {
    messageEl.style.display = "block";
    messageEl.innerHTML = "GAME OVER";
  }
});

// Slide and presentation events (if applicable)
socket.on("quizSlides", (data) => {
  // Implementation for slides if needed on the player side
});

socket.on("presentSlides", () => {
  if (messageEl) {
    messageEl.style.display = "block";
    messageEl.innerHTML = "Presenting...";
  }
  answerButtons.forEach((btn) => {
    if (btn) btn.style.visibility = "hidden";
  });
});

socket.on("presentingModeForPlayers", (data) => {
  console.log("performing presenting mode for players");
  answerButtons.forEach((btn) => {
    if (btn) btn.style.visibility = "hidden";
  });
  if (messageEl) {
    messageEl.style.display = "block";
    messageEl.innerHTML = data.message;
    console.log(data.message);
    console.log(messageEl.innerHTML);
    console.log(messageEl.style);
  }
});
