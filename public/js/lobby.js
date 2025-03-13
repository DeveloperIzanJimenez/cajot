// lobby.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  socket.on("connect", () => {
    const params = jQuery.deparam(window.location.search);
    socket.emit("player-join", params);
  });

  // Redirect to home if the game is not found or the host disconnects.
  const redirectToHome = () => window.location.href = "../";
  
  socket.on("noGameFound", redirectToHome);
  socket.on("hostDisconnect", redirectToHome);

  socket.on("gameStartedPlayer", () => {
    window.location.href = `/player/game/?id=${socket.id}`;
  });

  // Cache DOM elements for messages.
  const sendMessageButton = document.getElementById("sendMessageButton");
  const messageInput = document.getElementById("messageInput");

  sendMessageButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message !== "") {
      socket.emit("sendMessage", message);
      messageInput.value = "";
    }
  });

  socket.on("receiveMessage", (data) => {
    const formattedText = data.sender === "🤖 GPT" 
      ? `${data.sender} asks: "${data.text}"`
      : `${data.sender}: ${data.text}`;
    showMessage(formattedText, "white");
  });

  /**
   * Display a message in the message box.
   * @param {string} text - The message text to display.
   * @param {string} [color="white"] - The color of the text.
   * @param {number|null} [timeout=5000] - Duration in ms before removing the message.
   */
  function showMessage(text, color = "white", timeout = 5000) {
    const messageBox = document.getElementById("messageBox");
    if (!messageBox) {
      console.error("Element with id 'messageBox' not found in the DOM.");
      return;
    }

    const message = document.createElement("p");
    message.textContent = text;
    Object.assign(message.style, {
      color,
      textAlign: "center",
      fontSize: "18px",
      fontFamily: "'Raleway', sans-serif"
    });
    messageBox.appendChild(message);
    messageBox.scrollTop = messageBox.scrollHeight;

    if (timeout !== null) {
      setTimeout(() => {
        if (messageBox.contains(message)) {
          messageBox.removeChild(message);
        }
      }, timeout);
    }
  }

  socket.on("welcomeMessage", (data) => {
    showMessage(`Welcome, ${data.name}!`, "yellow");
  });

  socket.on("newPlayerJoined", (data) => {
    showMessage(`${data.name} has joined the game!`, "lightgreen");
  });
});
