// create.js
const socket = io();

/**
 * Request game names when the socket connects.
 */
socket.on('connect', () => {
  socket.emit('requestDbNames');
});

/**
 * Render a list of game names as buttons.
 * @param {Array} games - Array of game objects with 'id' and 'name'.
 */
socket.on('gameNamesData', (games) => {
  const gameListDiv = document.getElementById('game-list');
  if (!gameListDiv) {
    console.error("Element with id 'game-list' not found.");
    return;
  }
  
  games.forEach(game => {
    const button = createGameButton(game);
    gameListDiv.appendChild(button);
    // Optionally, add spacing using CSS or additional elements
    gameListDiv.appendChild(document.createElement('br'));
    gameListDiv.appendChild(document.createElement('br'));
  });
});

/**
 * Create a button element for a given game.
 * @param {Object} game - Game object containing an 'id' and 'name'.
 * @returns {HTMLButtonElement} The button element.
 */
function createGameButton(game) {
  const button = document.createElement('button');
  button.textContent = game.name;
  button.addEventListener('click', () => startGame(game.id));
  // If multiple buttons are rendered, consider a unique id or class
  button.id = 'gameButton';
  return button;
}

/**
 * Redirects the user to start the game.
 * @param {string} gameId - The id of the game.
 */
function startGame(gameId) {
  window.location.href = `/host/?id=${gameId}`;
}
