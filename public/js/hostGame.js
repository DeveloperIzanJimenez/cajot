/**
 * hostGame.js
 * Manages the host game view: question display, timer, slide presentation, and player updates.
 */

const socket = io();
console.log("[DEBUG] Inicializando hostGame.js: socket creado");

const params = jQuery.deparam(window.location.search); // Extracts the id from the URL
console.log("[DEBUG] Extrayendo parámetros de la URL:", params);

// Timer and slide state
let timer;
let time = 20; // Initial time in seconds
let slideImages = [];
let currentSlideIndex = 0;
let questionsStarted = false;
console.log("[DEBUG] Estado inicial: time =", time, ", slideImages =", slideImages, ", currentSlideIndex =", currentSlideIndex);

// Cache frequently used DOM elements
const questionEl = document.getElementById("question");
const answerEls = {
  answer1: document.getElementById("answer1"),
  answer2: document.getElementById("answer2"),
  answer3: document.getElementById("answer3"),
  answer4: document.getElementById("answer4"),
};
const playersAnsweredEl = document.getElementById("playersAnswered");
const slideContainerEl = document.getElementById("slideContainer");
const slideImageEl = document.getElementById("slideImage");
const nextQButtonEl = document.getElementById("nextQButton");
const timerTextEl = document.getElementById("timerText");
const numEl = document.getElementById("num");
const prevSlideButtonEl = document.getElementById("prevSlideButton");
const nextSlideButtonEl = document.getElementById("nextSlideButton");
console.log("[DEBUG] Elementos del DOM cacheados");

// Cuando el host se conecta desde la vista del juego, se une al juego
socket.on("connect", () => {
  console.log("[DEBUG] Evento 'connect' recibido. Desde: socket.io | Hacia: hostGame.js");
  console.log("[DEBUG] Llamando a socket.emit('host-join-game'). Desde: hostGame.js | Hacia: server, con params:", params);
  socket.emit("host-join-game", params);
});

// Redirige a home si no se encuentra el juego
socket.on("noGameFound", () => {
  console.log("[DEBUG] Evento 'noGameFound' recibido. Redireccionando a home.");
  window.location.href = "../../";
});

// Maneja la recepción de datos de la pregunta actual
socket.on("gameQuestions", (data) => {
  console.log("[DEBUG] Evento 'gameQuestions' recibido. Desde: server | Hacia: hostGame.js, data:", data);
  if (questionEl) {
    questionEl.style.display = "block";
    questionEl.innerHTML = data.q1;
    console.log("[DEBUG] Actualizando questionEl con:", data.q1);
  }
  if (answerEls.answer1) {
    answerEls.answer1.innerHTML = data.a1;
    console.log("[DEBUG] Actualizando answer1 con:", data.a1);
  }
  if (answerEls.answer2) {
    answerEls.answer2.innerHTML = data.a2;
    console.log("[DEBUG] Actualizando answer2 con:", data.a2);
  }
  if (answerEls.answer3) {
    answerEls.answer3.innerHTML = data.a3;
    console.log("[DEBUG] Actualizando answer3 con:", data.a3);
  }
  if (answerEls.answer4) {
    answerEls.answer4.innerHTML = data.a4;
    console.log("[DEBUG] Actualizando answer4 con:", data.a4);
  }
  if (playersAnsweredEl) {
    playersAnsweredEl.innerHTML = `Players Answered 0 / ${data.playersInGame}`;
    console.log("[DEBUG] Actualizando playersAnsweredEl con: Players Answered 0 /", data.playersInGame);
  }
  console.log("[DEBUG] Llamando a updateTimer desde gameQuestions");
  updateTimer();
});

// Recibe datos de slides para el modo presentación
socket.on("presentSlides", (data) => {
  console.log("[DEBUG] Evento 'presentSlides' recibido. Desde: server | Hacia: hostGame.js, data:", data);
  slideImages = data.slides;
  currentSlideIndex = 0;
  console.log("[DEBUG] Asignando slideImages y currentSlideIndex:", slideImages, currentSlideIndex);
  console.log("[DEBUG] Llamando a showSlide con currentSlideIndex:", currentSlideIndex);
  showSlide(currentSlideIndex);

  // Notificar a los jugadores que se muestran las diapositivas (ocultar botones de respuesta)
  console.log("[DEBUG] Llamando a socket.emit('hideAnswersForPlayers'). Desde: hostGame.js | Hacia: server");
  socket.emit("hideAnswersForPlayers");
});

// Modo presentación opcional
socket.on("presentingMode", (data) => {
  console.log("[DEBUG] Evento 'presentingMode' recibido. Desde: server | Hacia: hostGame.js, data:", data);
  console.log("[DEBUG] Mostrando mensaje de presentingMode:", data.message);
  console.log("[DEBUG] Llamando a socket.emit('presentingMode'). Desde: hostGame.js | Hacia: server");
  socket.emit("presentingMode");
});

/**
 * Displays a slide based on the given index.
 * Hides question elements when showing slides.
 *
 * @param {number} index - The index of the slide to display.
 */
function showSlide(index) {
  console.log(`[DEBUG] Entrando a showSlide con index: ${index}`);
  if (!slideContainerEl || !slideImageEl) {
    console.log("[DEBUG] slideContainerEl o slideImageEl no encontrados. Saliendo de showSlide.");
    return;
  }

  if (
    slideImages &&
    slideImages.length > 0 &&
    index >= 0 &&
    index < slideImages.length
  ) {
    console.log(`[DEBUG] Mostrando slide ${index}: ${slideImages[index]}. Desde: showSlide | Hacia: DOM`);
    slideImageEl.src = slideImages[index];
    slideContainerEl.style.display = "block";

    // Ocultar elementos de la pregunta durante la presentación de slides
    if (questionEl) {
      questionEl.style.display = "none";
      console.log("[DEBUG] Ocultando questionEl en showSlide");
    }
    Object.values(answerEls).forEach((el) => {
      if (el) {
        el.style.display = "none";
        console.log("[DEBUG] Ocultando un answerEl en showSlide");
      }
    });
    if (nextQButtonEl) {
      nextQButtonEl.style.display = "none";
      console.log("[DEBUG] Ocultando nextQButtonEl en showSlide");
    }
    if (timerTextEl) {
      timerTextEl.style.display = "none";
      console.log("[DEBUG] Ocultando timerTextEl en showSlide");
    }

    // Actualizar botones de navegación de slides
    console.log("[DEBUG] Llamando a updateSlideNavigation desde showSlide");
    updateSlideNavigation();

    // Si estamos en la última slide, notificar al servidor
    if (index === slideImages.length - 1) {
      console.log("[DEBUG] Última slide mostrada. Llamando a socket.emit('endSlides') desde showSlide");
      socket.emit("endSlides");
    }
  } else {
    console.log("[DEBUG] Índice de slide inválido en showSlide:", index);
  }
}

/**
 * Updates the visibility of slide navigation buttons based on the current slide.
 */
function updateSlideNavigation() {
  console.log("[DEBUG] Entrando a updateSlideNavigation");
  // Si no hay slides, ocultar ambos botones
  if (slideImages.length === 0) {
    if (prevSlideButtonEl) {
      prevSlideButtonEl.style.display = "none";
      console.log("[DEBUG] Ocultando prevSlideButtonEl en updateSlideNavigation (no hay slides)");
    }
    if (nextSlideButtonEl) {
      nextSlideButtonEl.style.display = "none";
      console.log("[DEBUG] Ocultando nextSlideButtonEl en updateSlideNavigation (no hay slides)");
    }
    return;
  }

  // Ocultar botón "Anterior" en la primera slide; de lo contrario, mostrarlo.
  if (currentSlideIndex === 0) {
    if (prevSlideButtonEl) {
      prevSlideButtonEl.style.display = "none";
      console.log("[DEBUG] Primera slide: Ocultando prevSlideButtonEl en updateSlideNavigation");
    }
  } else {
    if (prevSlideButtonEl) {
      prevSlideButtonEl.style.display = "inline-block";
      console.log("[DEBUG] No es la primera slide: Mostrando prevSlideButtonEl en updateSlideNavigation");
    }
  }

  if (questionsStarted) {
    if (prevSlideButtonEl) {
      prevSlideButtonEl.style.display = "none";
      console.log("[DEBUG] questionsStarted true: Ocultando prevSlideButtonEl en updateSlideNavigation");
    }
    if (nextSlideButtonEl) {
      nextSlideButtonEl.style.display = "none";
      console.log("[DEBUG] questionsStarted true: Ocultando nextSlideButtonEl en updateSlideNavigation");
    }
  } else {
    if (prevSlideButtonEl) {
      prevSlideButtonEl.style.display = "inline-block";
      console.log("[DEBUG] questionsStarted false: Mostrando prevSlideButtonEl en updateSlideNavigation");
    }
    if (nextSlideButtonEl) {
      nextSlideButtonEl.style.display = "inline-block";
      console.log("[DEBUG] questionsStarted false: Mostrando nextSlideButtonEl en updateSlideNavigation");
    }
  }
}

// Cambia a la vista de preguntas después de terminar los slides
socket.on("startQuestions", () => {
  console.log("[DEBUG] Evento 'startQuestions' recibido en hostGame.js");
  if (slideContainerEl) {
    slideContainerEl.style.display = "none";
    console.log("[DEBUG] Ocultando slideContainerEl en startQuestions");
  }
  console.log("[DEBUG] Llamando a updateSlideNavigation desde startQuestions");
  updateSlideNavigation();
  if (questionEl) {
    questionEl.style.display = "block";
    console.log("[DEBUG] Mostrando questionEl en startQuestions");
  }
  Object.values(answerEls).forEach((el) => {
    if (el) {
      el.style.display = "block";
      console.log("[DEBUG] Mostrando un answerEl en startQuestions");
    }
  });
  if (timerTextEl) {
    timerTextEl.style.display = "block";
    console.log("[DEBUG] Mostrando timerTextEl en startQuestions");
  }
  console.log("[DEBUG] Llamando a socket.emit('showAnswersForPlayers') en startQuestions");
  socket.emit("showAnswersForPlayers");
  console.log("[DEBUG] Llamando a nextQuestion desde startQuestions");
  nextQuestion();
});

/**
 * Advances to the next slide. If no more slides exist,
 * emits an event to transition to questions.
 */
function nextSlide() {
  console.log("[DEBUG] Entrando a nextSlide");
  if (currentSlideIndex < slideImages.length - 1) {
    console.log("[DEBUG] Incrementando currentSlideIndex desde nextSlide. De:", currentSlideIndex, "a:", currentSlideIndex + 1);
    currentSlideIndex++;
    console.log("[DEBUG] Llamando a showSlide desde nextSlide con index:", currentSlideIndex);
    showSlide(currentSlideIndex);
  } else {
    console.log("[DEBUG] No hay más slides en nextSlide.");
    console.log("[DEBUG] Llamando a socket.emit('endSlides') desde nextSlide");
    socket.emit("endSlides");
    if (!questionsStarted) {
      questionsStarted = true;
      console.log("[DEBUG] Estableciendo questionsStarted a true en nextSlide");
      setTimeout(() => {
        console.log("[DEBUG] Llamando a socket.emit('startQuestions') desde setTimeout en nextSlide");
        socket.emit("startQuestions");
      }, 1000);
    }
  }
}

function previousSlide() {
  console.log("[DEBUG] Entrando a previousSlide");
  if (currentSlideIndex > 0) {
    console.log("[DEBUG] Decrementando currentSlideIndex en previousSlide. De:", currentSlideIndex, "a:", currentSlideIndex - 1);
    currentSlideIndex--;
    console.log("[DEBUG] Llamando a showSlide desde previousSlide con index:", currentSlideIndex);
    showSlide(currentSlideIndex);
  } else {
    console.log("[DEBUG] Ya se está en la primera slide en previousSlide.");
  }
}

/**
 * Ends the slide presentation and transitions to questions.
 */
function endPresentation() {
  console.log("[DEBUG] Entrando a endPresentation");
  if (slideContainerEl) {
    slideContainerEl.style.display = "none";
    console.log("[DEBUG] Ocultando slideContainerEl en endPresentation");
  }
  if (questionEl) {
    questionEl.style.display = "block";
    console.log("[DEBUG] Mostrando questionEl en endPresentation");
  }
  Object.values(answerEls).forEach((el) => {
    if (el) {
      el.style.display = "block";
      console.log("[DEBUG] Mostrando un answerEl en endPresentation");
    }
  });
  if (timerTextEl) {
    timerTextEl.style.display = "block";
    console.log("[DEBUG] Mostrando timerTextEl en endPresentation");
  }
  console.log("[DEBUG] Llamando a socket.emit('nextQuestion') en endPresentation");
  socket.emit("nextQuestion");
}

// Actualiza el contador de jugadores que han respondido
socket.on("updatePlayersAnswered", (data) => {
  console.log("[DEBUG] Evento 'updatePlayersAnswered' recibido. Desde: server | Hacia: hostGame.js, data:", data);
  if (playersAnsweredEl) {
    playersAnsweredEl.innerHTML = `Players Answered ${data.playersAnswered} / ${data.playersInGame}`;
    console.log("[DEBUG] Actualizando playersAnsweredEl con:", playersAnsweredEl.innerHTML);
  }
});

/**
 * When a question is over, clear the timer, show results, and highlight the correct answer.
 *
 * @param {Array} playerData - Array of player responses.
 * @param {number} correct - The number (1-4) indicating the correct answer.
 */
socket.on("questionOver", (playerData, correct) => {
  console.log("[DEBUG] Evento 'questionOver' recibido. Desde: server | Hacia: hostGame.js, playerData:", playerData, "correct:", correct);
  clearInterval(timer);
  console.log("[DEBUG] Detenido timer en questionOver");

  // Inicializar contadores
  let counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let total = 0;

  if (playersAnsweredEl) {
    playersAnsweredEl.style.display = "none";
    console.log("[DEBUG] Ocultando playersAnsweredEl en questionOver");
  }
  if (timerTextEl) {
    timerTextEl.style.display = "none";
    console.log("[DEBUG] Ocultando timerTextEl en questionOver");
  }

  // Resaltar la respuesta correcta y aplicar grayscale a las demás
  for (let option = 1; option <= 4; option++) {
    const ansEl = answerEls[`answer${option}`];
    if (!ansEl) continue;
    if (Number(correct) === option) {
      ansEl.style.filter = "none";
      ansEl.innerHTML = "&#10004 " + ansEl.innerHTML;
      console.log(`[DEBUG] Resaltando respuesta correcta en questionOver: opción ${option}`);
    } else {
      ansEl.style.filter = "grayscale(50%)";
      console.log(`[DEBUG] Aplicando grayscale a opción ${option} en questionOver`);
    }
  }

  // Contar respuestas
  playerData.forEach((player) => {
    const answer = player.gameData.answer;
    if (counts[answer] !== undefined) {
      counts[answer]++;
      total++;
      console.log("[DEBUG] Contando respuesta de", player.name, "con opción:", answer);
    }
  });

  // Calcular porcentaje para cada respuesta
  const percentages = {};
  for (let option = 1; option <= 4; option++) {
    percentages[option] = total ? (counts[option] / total) * 100 : 0;
    console.log(`[DEBUG] Porcentaje para opción ${option}: ${percentages[option]}%`);
  }

  // Mostrar resultados usando elementos gráficos (squares)
  for (let option = 1; option <= 4; option++) {
    const squareEl = document.getElementById(`square${option}`);
    if (squareEl) {
      squareEl.style.display = "inline-block";
      squareEl.style.height = `${percentages[option]}px`;
      console.log(`[DEBUG] Actualizando square${option} con altura: ${percentages[option]}px`);
    }
  }

  if (nextQButtonEl) {
    nextQButtonEl.style.display = "block";
    console.log("[DEBUG] Mostrando nextQButtonEl en questionOver");
  }
});

/**
 * Prepara la interfaz para la siguiente pregunta, reiniciando estilos y elementos,
 * y notifica al servidor para avanzar a la siguiente pregunta.
 */
function nextQuestion() {
  console.log("[DEBUG] Llamando a nextQuestion en hostGame.js");
  if (nextQButtonEl) {
    nextQButtonEl.style.display = "none";
    console.log("[DEBUG] Ocultando nextQButtonEl en nextQuestion");
  }
  for (let option = 1; option <= 4; option++) {
    const squareEl = document.getElementById(`square${option}`);
    if (squareEl) {
      squareEl.style.display = "none";
      console.log(`[DEBUG] Ocultando square${option} en nextQuestion`);
    }
    const ansEl = answerEls[`answer${option}`];
    if (ansEl) {
      ansEl.style.filter = "none";
      console.log(`[DEBUG] Reiniciando filtro de answer${option} en nextQuestion`);
    }
  }

  if (playersAnsweredEl) {
    playersAnsweredEl.style.display = "block";
    console.log("[DEBUG] Mostrando playersAnsweredEl en nextQuestion");
  }
  if (timerTextEl) {
    timerTextEl.style.display = "block";
    console.log("[DEBUG] Mostrando timerTextEl en nextQuestion");
  }
  if (numEl) {
    numEl.innerHTML = " 20";
    console.log("[DEBUG] Reiniciando numEl a 20 en nextQuestion");
  }

  console.log("[DEBUG] Llamando a socket.emit('nextQuestion') en nextQuestion");
  socket.emit("nextQuestion");
}

/**
 * Inicia o reinicia el temporizador de la pregunta.
 */
function updateTimer() {
  console.log("[DEBUG] Entering updateTimer function");
  // Detener cualquier intervalo previo
  if (timer) {
    clearInterval(timer);
    console.log("[DEBUG] Clearing previous timer interval");
  }
  time = 20;
  console.log("[DEBUG] Timer reset to 20 seconds in updateTimer");
  timer = setInterval(() => {
    if (time <= 0) {
      console.log("[DEBUG] Time reached 0. Clearing timer and emitting 'timeUp'");
      clearInterval(timer);
      socket.emit("timeUp");
    } else {
      time--;
      if (numEl) {
        numEl.textContent = " " + time;
        console.log("[DEBUG] Timer updated. Current time:", time);
      }
    }
  }, 1000);
}

// Cuando el juego termina, se muestra el ranking final y se ocultan elementos del juego
socket.on("GameOver", (data) => {
  console.log("[DEBUG] Evento 'GameOver' recibido en hostGame.js, data:", data);
  if (nextQButtonEl) {
    nextQButtonEl.style.display = "none";
    console.log("[DEBUG] Ocultando nextQButtonEl en GameOver");
  }
  for (let option = 1; option <= 4; option++) {
    const squareEl = document.getElementById(`square${option}`);
    if (squareEl) {
      squareEl.style.display = "none";
      console.log(`[DEBUG] Ocultando square${option} en GameOver`);
    }
    const ansEl = answerEls[`answer${option}`];
    if (ansEl) {
      ansEl.style.display = "none";
      console.log(`[DEBUG] Ocultando answer${option} en GameOver`);
    }
  }
  if (timerTextEl) {
    timerTextEl.innerHTML = "";
    console.log("[DEBUG] Limpiando timerTextEl en GameOver");
  }
  if (questionEl) {
    questionEl.innerHTML = "GAME OVER";
    console.log("[DEBUG] Mostrando 'GAME OVER' en questionEl en GameOver");
  }
  if (playersAnsweredEl) {
    playersAnsweredEl.innerHTML = "";
    console.log("[DEBUG] Limpiando playersAnsweredEl en GameOver");
  }

  // Mostrar elementos del ranking final
  [1, 2, 3, 4, 5].forEach((num) => {
    const winnerEl = document.getElementById(`winner${num}`);
    if (winnerEl) {
      winnerEl.style.display = "block";
      winnerEl.innerHTML = `${num}. ${data["num" + num]}`;
      console.log(`[DEBUG] Actualizando winner${num} con: ${data["num" + num]} en GameOver`);
    }
  });
  const winnerTitleEl = document.getElementById("winnerTitle");
  if (winnerTitleEl) {
    winnerTitleEl.style.display = "block";
    console.log("[DEBUG] Mostrando winnerTitleEl en GameOver");
  }

  if (slideContainerEl) {
    slideContainerEl.style.display = "none";
    console.log("[DEBUG] Ocultando slideContainerEl en GameOver");
  }
});

// Envía el valor actual del temporizador al servidor cuando se solicita
socket.on("getTime", (player) => {
  console.log("[DEBUG] Evento 'getTime' recibido en hostGame.js para jugador:", player);
  console.log("[DEBUG] Llamando a socket.emit('time') con data { player:", player, ", time:", time, "}");
  socket.emit("time", { player, time });
});
