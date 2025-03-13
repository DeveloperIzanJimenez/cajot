// host.js
const socket = io();
const params = jQuery.deparam(window.location.search);

/**
 * Initialize host page functionality.
 */
function initHost() {
  socket.on("connect", () => {
    const playersTextArea = document.getElementById("players");
    if (playersTextArea) playersTextArea.value = "";
    socket.emit("host-join", params);
  });

  socket.on("showGamePin", (data) => {
    const gamePinText = document.getElementById("gamePinText");
    if (gamePinText) gamePinText.innerHTML = data.pin;
  });

  socket.on("updatePlayerLobby", (players) => {
    const playersTextArea = document.getElementById("players");
    if (!playersTextArea) {
      console.error("Players element not found");
      return;
    }
    // Use join to avoid multiple DOM lookups inside the loop.
    playersTextArea.value = players.map(player => player.name).join("\n");
  });

  socket.on("gameStarted", (id) => {
    console.log("Game Started!");
    window.location.href = `/host/game/?id=${id}`;
  });

  socket.on("noGameFound", () => {
    window.location.href = "../../";
  });

  socket.on("receiveMessage", (data) => {
    showMessage(`${data.sender}: ${data.text}`, "white", null);
  });
}

/**
 * Called when the "Start Game" button is clicked.
 * Emits the start game event to the server.
 */
function startGame() {
  socket.emit("startGame");
}

/**
 * Ends the game and redirects to the home page.
 */
function endGame() {
  window.location.href = "/";
}

/**
 * Displays a message in the designated messageBox.
 *
 * @param {string} text - The message text.
 * @param {string} [color="white"] - The text color.
 * @param {number|null} [timeout=5000] - Duration in milliseconds before the message is removed. Set to null to disable auto-removal.
 */
function showMessage(text, color = "white", timeout = 5000) {
  const messageBox = document.getElementById("messageBox");
  if (!messageBox) {
    console.error("messageBox not found in the DOM.");
    return;
  }

  const message = document.createElement("p");
  message.textContent = text;
  Object.assign(message.style, {
    color,
    textAlign: "left",
    fontSize: "18px",
    fontFamily: "'Raleway', sans-serif"
  });

  messageBox.appendChild(message);

  if (timeout !== null) {
    setTimeout(() => {
      if (messageBox.contains(message)) {
        messageBox.removeChild(message);
      }
    }, timeout);
  }
}

document.addEventListener("DOMContentLoaded", initHost);
