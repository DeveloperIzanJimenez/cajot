// server/sockets/socketEvents.js
/**
 * Agrupa todos los eventos de Socket.io.
 * Recibe el objeto io, además de las instancias de games y players.
 */
const MongoClient = require("mongodb").MongoClient;
const path = require("path");
const { OpenAI } = require("openai"); // Cliente para la API de OpenAI

// Configuración de MongoDB y colección
const dbUrl = "mongodb://localhost:27017/";
const kahootDB = "kahootDB";
const kahootCollection = "kahootGames";

// Configuración para la API de OpenAI
const baseURL = "https://api.aimlapi.com/";
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey, // Clave API obtenida desde las variables de entorno
  baseURL, // URL base de la API
});
const systemPrompt =
  "You are a university chatbot agent. Be descriptive and helpful";

// Función auxiliar para calcular el ranking
function calculateRanking(playersInGame) {
  console.log(
    "[DEBUG] Entrando a calculateRanking con playersInGame:",
    playersInGame
  );
  const sorted = playersInGame
    .slice()
    .sort((a, b) => b.gameData.score - a.gameData.score);
  const ranking = {
    num1: sorted[0] ? sorted[0].name : "",
    num2: sorted[1] ? sorted[1].name : "",
    num3: sorted[2] ? sorted[2].name : "",
    num4: sorted[3] ? sorted[3].name : "",
    num5: sorted[4] ? sorted[4].name : "",
  };
  console.log("[DEBUG] Salida de calculateRanking con ranking:", ranking);
  return ranking;
}

module.exports = function (io, games, players) {
  console.log("[DEBUG] Inicializando módulo socketEvents");

  io.on("connection", (socket) => {
    console.log(
      "[DEBUG] Evento 'connection' recibido. Desde: servidor | Hacia: socket",
      socket.id
    );

    // ---------- Eventos básicos ----------
    socket.on("startQuestions", () => {
      console.log(
        "[DEBUG] Evento 'startQuestions' recibido en socket:",
        socket.id
      );
      console.log(
        "[DEBUG] Llamando a io.emit('startQuestions'). Desde: socket",
        socket.id,
        "| Hacia: todos"
      );
      io.emit("startQuestions");
    });

    socket.on("player-join", (data) => {
      console.log(
        "[DEBUG] Evento 'player-join' recibido en socket:",
        socket.id,
        "con data:",
        data
      );
      console.log(
        "[DEBUG] Llamando a socket.broadcast.emit('newPlayerJoined'). Desde: socket",
        socket.id,
        "| Hacia: broadcast"
      );
      socket.join(data.pin); // Asegúrate de que el socket se una a la sala correspondiente
      socket.broadcast
        .to(data.pin)
        .emit("newPlayerJoined", { name: data.name });
      console.log(
        "[DEBUG] Llamando a socket.emit('welcomeMessage'). Desde: socket",
        socket.id,
        "| Hacia: socket",
        socket.id
      );
      socket.emit("welcomeMessage", { name: data.name });
    });

    socket.on("sendMessage", async (message) => {
      console.log(
        "[DEBUG] Evento 'sendMessage' recibido en socket:",
        socket.id,
        "con mensaje:",
        message
      );
      console.log(
        "[DEBUG] Llamando a players.getPlayer. Desde: sendMessage | Hacia: players.getPlayer con socket id:",
        socket.id
      );
      const player = players.getPlayer(socket.id);
      if (!player) {
        console.error("Jugador no encontrado.");
        return;
      }
      console.log(
        "[DEBUG] Llamando a games.getGame. Desde: sendMessage | Hacia: games.getGame con hostId:",
        player.hostId
      );
      const game = games.getGame(player.hostId);
      if (!game) {
        console.error("Juego no encontrado para el jugador.");
        return;
      }

      if (message.startsWith("GPT:")) {
        console.log(
          `[DEBUG] Mensaje de AI/ML de ${player.name} en sala ${game.pin} recibido en sendMessage`
        );
        const userMessage = message.replace("GPT:", "").trim();
        console.log("[DEBUG] Mensaje de usuario para AI/ML:", userMessage);
        try {
          // Llamada a la API de OpenAI para obtener una respuesta
          const gptResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Modelo de AI utilizado
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
            temperature: 0.7,
            max_tokens: 256,
          });
          console.log("[DEBUG] Respuesta de AI/ML:", gptResponse);
          // Se extrae y limpia la respuesta del bot
          const botMessage = gptResponse.choices[0].message.content.trim();
          console.log("[DEBUG] Respuesta del bot:", botMessage);
          // Se envía el mensaje al juego, indicando que es una respuesta automatizada
          io.to(game.pin).emit("receiveMessage", {
            sender: `(${player.name})🤖 `,
            text: `${message}:\n${botMessage}`,
          });
        } catch (error) {
          console.error("Error con AI/ML API:", error);
          // En caso de error, se envía un mensaje de error a la sala
          io.to(game.pin).emit("receiveMessage", {
            sender: "⚠️ Error",
            text: "Error al procesar la solicitud con GPT.",
          });
        }
      } else {
        console.log(
          `[DEBUG] Mensaje normal de ${player.name} en sala ${game.pin} recibido en sendMessage`
        );
        console.log(
          "[DEBUG] Llamando a io.to.emit('receiveMessage'). Desde: sendMessage | Hacia: sala",
          game.pin
        );
        io.to(game.pin).emit("receiveMessage", {
          sender: player.name,
          text: message,
        });
      }
    });

    // ---------- Eventos del Host ----------
    socket.on("host-join", (data) => {
      console.log(
        "[DEBUG] Evento 'host-join' recibido en socket:",
        socket.id,
        "con data:",
        data
      );
      console.log(
        "[DEBUG] Llamando a MongoClient.connect. Desde: host-join | Hacia: MongoDB"
      );
      MongoClient.connect(dbUrl, (err, client) => {
        if (err) {
          console.error("Error de conexión a DB en host-join:", err);
          return socket.emit("noGameFound");
        }
        console.log("[DEBUG] Conexión a MongoDB exitosa en host-join");
        const dbo = client.db(kahootDB);
        console.log(
          "[DEBUG] Llamando a dbo.collection.find. Desde: host-join | Hacia: DB. Buscando id:",
          parseInt(data.id)
        );
        dbo
          .collection(kahootCollection)
          .find({ id: parseInt(data.id) })
          .toArray((err, result) => {
            if (err) {
              console.error("Error en consulta DB en host-join:", err);
              socket.emit("noGameFound");
              client.close();
              return;
            }
            if (result[0] !== undefined) {
              const gamePin = Math.floor(Math.random() * 90000) + 10000;
              console.log(
                "[DEBUG] Llamando a games.addGame. Desde: host-join | Hacia: games.addGame con gamePin:",
                gamePin,
                "y socket.id:",
                socket.id
              );
              games.addGame(gamePin, socket.id, false, {
                playersAnswered: 0,
                questionLive: false,
                gameid: data.id,
                question: 0,
              });
              console.log(
                "[DEBUG] Llamando a games.getGame. Desde: host-join | Hacia: games.getGame con host id:",
                socket.id
              );
              const game = games.getGame(socket.id);
              console.log(
                "[DEBUG] Llamando a socket.join. Desde: host-join | Hacia: sala",
                game.pin
              );
              socket.join(game.pin);
              console.log(
                "[DEBUG] Juego creado con pin:",
                game.pin,
                "| Emitiendo showGamePin al socket:",
                socket.id
              );
              socket.emit("showGamePin", { pin: game.pin });
            } else {
              console.log(
                "[DEBUG] No se encontró juego en DB en host-join. Emitiendo noGameFound al socket:",
                socket.id
              );
              socket.emit("noGameFound");
            }
            console.log("[DEBUG] Cerrando conexión a MongoDB en host-join");
            client.close();
          });
      });
    });

    socket.on("host-join-game", (data) => {
      console.log(
        "[DEBUG] Evento 'host-join-game' recibido en socket:",
        socket.id,
        "con data:",
        data
      );
      const oldHostId = data.id;
      console.log(
        "[DEBUG] Llamando a games.getGame. Desde: host-join-game | Hacia: games.getGame con oldHostId:",
        oldHostId
      );
      const game = games.getGame(oldHostId);
      if (game) {
        console.log(
          "[DEBUG] Juego encontrado. Actualizando hostId. Desde:",
          oldHostId,
          "Hacia:",
          socket.id
        );
        game.hostId = socket.id;
        console.log(
          "[DEBUG] Llamando a socket.join. Desde: host-join-game | Hacia: sala",
          game.pin
        );
        socket.join(game.pin);
        console.log(
          "[DEBUG] Actualizando hostId de los jugadores. Desde: host-join-game"
        );
        Object.values(players.players).forEach((player) => {
          if (player.hostId === oldHostId) {
            console.log(
              "[DEBUG] Actualizando hostId para jugador:",
              player.name,
              "de",
              oldHostId,
              "a",
              socket.id
            );
            player.hostId = socket.id;
          }
        });
        const gameid = game.gameData.gameid;
        console.log(
          `[DEBUG] Buscando juego en MongoDB. Desde: host-join-game | Hacia: DB. Buscando gameid: ${gameid}`
        );
        console.log(
          "[DEBUG] Llamando a MongoClient.connect. Desde: host-join-game | Hacia: MongoDB"
        );
        MongoClient.connect(dbUrl, (err, client) => {
          if (err) {
            console.error("Error de conexión a DB en host-join-game:", err);
            return;
          }
          console.log("[DEBUG] Conexión a MongoDB exitosa en host-join-game");
          const dbo = client.db(kahootDB);
          console.log(
            "[DEBUG] Llamando a dbo.collection.find. Desde: host-join-game | Hacia: DB. Buscando id:",
            parseInt(gameid)
          );
          dbo
            .collection(kahootCollection)
            .find({ id: parseInt(gameid) })
            .toArray((err, resArr) => {
              if (err) {
                console.error("Error en consulta DB en host-join-game:", err);
                client.close();
                return;
              }
              if (!resArr[0]) {
                console.warn(
                  "[WARNING] No se encontró juego en DB con ese ID en host-join-game."
                );
                client.close();
                return;
              }
              // Si existen slides se corrigen las rutas y se envían
              if (resArr[0].slides && resArr[0].slides.length > 0) {
                console.log(
                  "[DEBUG] Slides encontrados en host-join-game. Corrigiendo rutas..."
                );
                const slides = resArr[0].slides.map((slide) => {
                  let formattedSlide = slide.replace(/\\/g, "/");
                  if (formattedSlide.includes("server/uploads/")) {
                    formattedSlide = formattedSlide.split("server/")[1];
                  }
                  console.log(
                    `[DEBUG] Ruta transformada en host-join-game: ${slide} -> ${formattedSlide}`
                  );
                  return `/${formattedSlide}`;
                });
                console.log("[DEBUG] Rutas de slides corregidas:", slides);
                console.log(
                  "[DEBUG] Emitiendo presentSlides. Desde: host-join-game | Hacia: sala",
                  game.pin
                );
                io.to(game.pin).emit("presentSlides", { slides });
                console.log(
                  "[DEBUG] Emitiendo presentingMode al socket en host-join-game"
                );
                socket.emit("presentingMode", {
                  message: "Presentando slides...",
                });
                console.log(
                  "[DEBUG] Emitiendo presentingModeForPlayers. Desde: host-join-game | Hacia: sala",
                  game.pin
                );
                io.to(game.pin).emit("presentingModeForPlayers", {
                  message: "Presentando, por favor espere...",
                });
              } else {
                console.warn(
                  "[WARNING] No se encontraron slides en host-join-game. Enviando preguntas."
                );
                const firstQuestion = resArr[0].questions[0];
                console.log(
                  "[DEBUG] Emitiendo gameQuestions para la primera pregunta. Desde: host-join-game | Hacia: sala",
                  game.pin
                );
                io.to(game.pin).emit("gameQuestions", {
                  q1: firstQuestion.question,
                  a1: firstQuestion.answers[0],
                  a2: firstQuestion.answers[1],
                  a3: firstQuestion.answers[2],
                  a4: firstQuestion.answers[3],
                  correct: firstQuestion.correct,
                  playersInGame: players.getPlayers(oldHostId).length,
                });
                game.gameData.questionLive = true;
              }
              console.log(
                "[DEBUG] Cerrando conexión a MongoDB en host-join-game"
              );
              client.close();
            });
        });
        console.log("[DEBUG] Emitiendo gameStartedPlayer a sala", game.pin);
        io.to(game.pin).emit("gameStartedPlayer");
      } else {
        console.warn(
          "[WARNING] No se encontró juego con hostId en host-join-game."
        );
        socket.emit("noGameFound");
      }
    });

    // ---------- Eventos del Jugador ----------
    socket.on("player-join", (params) => {
      console.log(
        "[DEBUG] Evento 'player-join' (jugador) recibido en socket:",
        socket.id,
        "con params:",
        params
      );
      let gameFound = false;
      games.games.forEach((game) => {
        if (params.pin == game.pin) {
          console.log(
            "[DEBUG] Jugador conectado al juego. Desde: player-join (jugador) | Hacia: sala",
            game.pin
          );
          const hostId = game.hostId;
          console.log(
            "[DEBUG] Llamando a players.addPlayer. Desde: player-join (jugador) | Hacia: players.addPlayer con hostId:",
            hostId,
            "y socket.id:",
            socket.id
          );
          players.addPlayer(hostId, socket.id, params.name, {
            score: 0,
            answer: 0,
          });
          console.log(
            "[DEBUG] Llamando a socket.join. Desde: player-join (jugador) | Hacia: sala",
            params.pin
          );
          socket.join(params.pin);
          console.log(
            "[DEBUG] Llamando a players.getPlayers. Desde: player-join (jugador) | Hacia: players.getPlayers con hostId:",
            hostId
          );
          const playersInGame = players.getPlayers(hostId);
          console.log("[DEBUG] Emitiendo updatePlayerLobby a sala", params.pin);
          io.to(params.pin).emit("updatePlayerLobby", playersInGame);
          gameFound = true;
        }
      });
      if (!gameFound) {
        console.log(
          "[DEBUG] No se encontró juego en player-join (jugador). Emitiendo noGameFound al socket:",
          socket.id
        );
        socket.emit("noGameFound");
      }
    });

    socket.on("player-join-game", (data) => {
      console.log(
        "[DEBUG] Evento 'player-join-game' (jugador) recibido en socket:",
        socket.id,
        "con data:",
        data
      );
      console.log(
        "[DEBUG] Llamando a players.getPlayer. Desde: player-join-game | Hacia: players.getPlayer con id:",
        data.id
      );
      const player = players.getPlayer(data.id);
      if (player) {
        console.log(
          "[DEBUG] Llamando a games.getGame. Desde: player-join-game | Hacia: games.getGame con hostId:",
          player.hostId
        );
        const game = games.getGame(player.hostId);
        console.log(
          "[DEBUG] Llamando a socket.join. Desde: player-join-game | Hacia: sala",
          game.pin
        );
        socket.join(game.pin);
        console.log(
          "[DEBUG] Actualizando player.playerId. Desde: player-join-game | De:",
          player.playerId,
          "a:",
          socket.id
        );
        player.playerId = socket.id;
        console.log(
          "[DEBUG] Llamando a players.getPlayers. Desde: player-join-game | Hacia: players.getPlayers con hostId:",
          game.hostId
        );
        const playerData = players.getPlayers(game.hostId);
        console.log("[DEBUG] Emitiendo playerGameData al socket:", socket.id);
        socket.emit("playerGameData", playerData);
      } else {
        console.log(
          "[DEBUG] No se encontró jugador en player-join-game. Emitiendo noGameFound al socket:",
          socket.id
        );
        socket.emit("noGameFound");
      }
    });

    // ---------- Desconexión ----------
    socket.on("disconnect", () => {
      console.log("[DEBUG] Evento 'disconnect' recibido en socket:", socket.id);
      let game = games.getGame(socket.id);
      if (game) {
        console.log(
          "[DEBUG] Se encontró juego en disconnect para socket:",
          socket.id
        );
        if (game.gameLive == false) {
          console.log(
            "[DEBUG] Llamando a games.removeGame. Desde: disconnect | Hacia: games.removeGame con host:",
            socket.id
          );
          games.removeGame(socket.id);
          console.log(
            "[DEBUG] Juego terminado con pin:",
            game.pin,
            "en disconnect"
          );
          const playersToRemove = players.getPlayers(game.hostId);
          playersToRemove.forEach((p) => {
            console.log(
              "[DEBUG] Llamando a players.removePlayer. Desde: disconnect | Hacia: players.removePlayer para player:",
              p.playerId
            );
            players.removePlayer(p.playerId);
          });
          console.log("[DEBUG] Emitiendo hostDisconnect a sala:", game.pin);
          io.to(game.pin).emit("hostDisconnect");
          console.log(
            "[DEBUG] Llamando a socket.leave. Desde: disconnect | Hacia: sala",
            game.pin
          );
          socket.leave(game.pin);
        }
      } else {
        console.log(
          "[DEBUG] No se encontró juego en disconnect. Buscando jugador para socket:",
          socket.id
        );
        const player = players.getPlayer(socket.id);
        if (player) {
          const hostId = player.hostId;
          console.log(
            "[DEBUG] Llamando a games.getGame. Desde: disconnect | Hacia: games.getGame con hostId:",
            hostId
          );
          const game = games.getGame(hostId);
          if (game && game.gameLive == false) {
            console.log(
              "[DEBUG] Llamando a players.removePlayer. Desde: disconnect | Hacia: players.removePlayer para socket:",
              socket.id
            );
            players.removePlayer(socket.id);
            console.log(
              "[DEBUG] Llamando a players.getPlayers. Desde: disconnect | Hacia: players.getPlayers con hostId:",
              hostId
            );
            const playersInGame = players.getPlayers(hostId);
            console.log(
              "[DEBUG] Emitiendo updatePlayerLobby a sala:",
              game.pin
            );
            io.to(game.pin).emit("updatePlayerLobby", playersInGame);
            console.log(
              "[DEBUG] Llamando a socket.leave. Desde: disconnect | Hacia: sala",
              game.pin
            );
            socket.leave(game.pin);
          }
        }
      }
    });

    // ---------- Manejo de respuestas y preguntas ----------
    socket.on("playerAnswer", (num) => {
      console.log(
        "[DEBUG] Evento 'playerAnswer' recibido en socket:",
        socket.id,
        "con respuesta:",
        num
      );
      console.log(
        "[DEBUG] Llamando a players.getPlayer. Desde: playerAnswer | Hacia: players.getPlayer con socket id:",
        socket.id
      );
      const player = players.getPlayer(socket.id);
      const hostId = player.hostId;
      console.log(
        "[DEBUG] Llamando a players.getPlayers. Desde: playerAnswer | Hacia: players.getPlayers con hostId:",
        hostId
      );
      const playersInGame = players.getPlayers(hostId);
      console.log(
        "[DEBUG] Llamando a games.getGame. Desde: playerAnswer | Hacia: games.getGame con hostId:",
        hostId
      );
      const game = games.getGame(hostId);
      if (game.gameData.questionLive === true) {
        console.log(
          "[DEBUG] Procesando respuesta en playerAnswer. Registrando respuesta:",
          num
        );
        player.gameData.answer = num;
        game.gameData.playersAnswered += 1;
        const gameQuestion = game.gameData.question;
        const gameid = game.gameData.gameid;
        console.log(
          "[DEBUG] Llamando a MongoClient.connect. Desde: playerAnswer | Hacia: MongoDB con gameid:",
          gameid
        );
        MongoClient.connect(dbUrl, (err, client) => {
          if (err) throw err;
          console.log("[DEBUG] Conexión a MongoDB exitosa en playerAnswer");
          const dbo = client.db(kahootDB);
          console.log(
            "[DEBUG] Llamando a dbo.collection.find. Desde: playerAnswer | Hacia: DB. Buscando gameid:",
            parseInt(gameid)
          );
          dbo
            .collection(kahootCollection)
            .find({ id: parseInt(gameid) })
            .toArray((err, resArr) => {
              if (err) throw err;
              const correctAnswer =
                resArr[0].questions[gameQuestion - 1].correct;
              if (num == correctAnswer) {
                console.log(
                  "[DEBUG] Respuesta correcta en playerAnswer. Incrementando score de:",
                  player.name
                );
                player.gameData.score += 100;
                console.log(
                  "[DEBUG] Llamando a io.to.emit('getTime'). Desde: playerAnswer | Hacia: sala",
                  game.pin,
                  "para socket:",
                  socket.id
                );
                io.to(game.pin).emit("getTime", socket.id);
                console.log(
                  "[DEBUG] Llamando a socket.emit('answerResult') con true. Desde: playerAnswer para socket:",
                  socket.id
                );
                socket.emit("answerResult", true);
              }
              if (game.gameData.playersAnswered === playersInGame.length) {
                console.log(
                  "[DEBUG] Todas las respuestas recibidas en playerAnswer. Finalizando pregunta."
                );
                game.gameData.questionLive = false;
                console.log(
                  "[DEBUG] Llamando a players.getPlayers. Desde: playerAnswer | Hacia: players.getPlayers con hostId:",
                  game.hostId
                );
                const playerData = players.getPlayers(game.hostId);
                console.log("[DEBUG] Emitiendo questionOver a sala:", game.pin);
                io.to(game.pin).emit("questionOver", playerData, correctAnswer);
              } else {
                console.log(
                  "[DEBUG] Aún no se han recibido todas las respuestas en playerAnswer. Emitiendo updatePlayersAnswered a sala:",
                  game.pin
                );
                io.to(game.pin).emit("updatePlayersAnswered", {
                  playersInGame: playersInGame.length,
                  playersAnswered: game.gameData.playersAnswered,
                });
              }
              console.log(
                "[DEBUG] Cerrando conexión a MongoDB en playerAnswer"
              );
              client.close();
            });
        });
      }
    });

    socket.on("getScore", () => {
      console.log("[DEBUG] Evento 'getScore' recibido en socket:", socket.id);
      const player = players.getPlayer(socket.id);
      console.log(
        "[DEBUG] Llamando a socket.emit('newScore'). Desde: getScore | Hacia: socket",
        socket.id,
        "con score:",
        player.gameData.score
      );
      socket.emit("newScore", player.gameData.score);
    });

    socket.on("time", (data) => {
      console.log(
        "[DEBUG] Evento 'time' recibido en socket:",
        socket.id,
        "con data:",
        data
      );
      let timePercent = (data.time / 20) * 100;
      console.log(
        "[DEBUG] Calculado timePercent:",
        timePercent,
        "para jugador:",
        data.player
      );
      const player = players.getPlayer(data.player);
      console.log(
        "[DEBUG] Incrementando score del jugador en time handler. Score antes:",
        player.gameData.score
      );
      player.gameData.score += timePercent;
      console.log("[DEBUG] Nuevo score del jugador:", player.gameData.score);
    });

    socket.on("timeUp", () => {
      console.log("[DEBUG] Evento 'timeUp' recibido en socket:", socket.id);
      const game = games.getGame(socket.id);
      console.log(
        "[DEBUG] Llamando a games.getGame. Desde: timeUp | Hacia: games.getGame con socket id:",
        socket.id
      );
      game.gameData.questionLive = false;
      console.log(
        "[DEBUG] Llamando a players.getPlayers. Desde: timeUp | Hacia: players.getPlayers con hostId:",
        game.hostId
      );
      const playerData = players.getPlayers(game.hostId);
      const gameQuestion = game.gameData.question;
      const gameid = game.gameData.gameid;
      console.log(
        "[DEBUG] Llamando a MongoClient.connect. Desde: timeUp | Hacia: MongoDB con gameid:",
        gameid
      );
      MongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        console.log("[DEBUG] Conexión a MongoDB exitosa en timeUp");
        const dbo = client.db(kahootDB);
        console.log(
          "[DEBUG] Llamando a dbo.collection.find. Desde: timeUp | Hacia: DB. Buscando gameid:",
          parseInt(gameid)
        );
        dbo
          .collection(kahootCollection)
          .find({ id: parseInt(gameid) })
          .toArray((err, resArr) => {
            if (err) throw err;
            const correctAnswer = resArr[0].questions[gameQuestion - 1].correct;
            console.log(
              "[DEBUG] Emitiendo questionOver a sala:",
              game.pin,
              "en timeUp"
            );
            io.to(game.pin).emit("questionOver", playerData, correctAnswer);
            console.log("[DEBUG] Cerrando conexión a MongoDB en timeUp");
            client.close();
          });
      });
    });

    socket.on("nextQuestion", () => {
      console.log(
        "[DEBUG] Evento 'nextQuestion' recibido en socket:",
        socket.id
      );
      console.log(
        "[DEBUG] Llamando a players.getPlayers. Desde: nextQuestion | Hacia: players.getPlayers con socket id:",
        socket.id
      );
      const playersInGame = players.getPlayers(socket.id);
      console.log(
        "[DEBUG] Reiniciando respuestas de jugadores en nextQuestion"
      );
      Object.values(players.players).forEach((player) => {
        if (player.hostId == socket.id) {
          console.log("[DEBUG] Reiniciando respuesta de jugador:", player.name);
          player.gameData.answer = 0;
        }
      });
      console.log(
        "[DEBUG] Llamando a games.getGame. Desde: nextQuestion | Hacia: games.getGame con socket id:",
        socket.id
      );
      const game = games.getGame(socket.id);
      game.gameData.playersAnswered = 0;
      game.gameData.questionLive = true;
      if (game.gameData.question === 0) {
        console.log(
          "[DEBUG] Primera pregunta después de slides en nextQuestion. Estableciendo question a 1"
        );
        game.gameData.question = 1;
      } else {
        game.gameData.question += 1;
        console.log(
          "[DEBUG] Incrementando question en nextQuestion a:",
          game.gameData.question
        );
      }
      const gameid = game.gameData.gameid;
      console.log(
        "[DEBUG] Llamando a MongoClient.connect. Desde: nextQuestion | Hacia: MongoDB con gameid:",
        gameid
      );
      MongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        console.log("[DEBUG] Conexión a MongoDB exitosa en nextQuestion");
        const dbo = client.db(kahootDB);
        console.log(
          "[DEBUG] Llamando a dbo.collection.find. Desde: nextQuestion | Hacia: DB. Buscando gameid:",
          parseInt(gameid)
        );
        dbo
          .collection(kahootCollection)
          .find({ id: parseInt(gameid) })
          .toArray((err, resArr) => {
            if (err) throw err;
            if (resArr[0].questions.length >= game.gameData.question) {
              const questionNum = game.gameData.question - 1;
              const currentQuestion = resArr[0].questions[questionNum];
              console.log(
                "[DEBUG] Emitiendo gameQuestions a sala:",
                game.pin,
                "en nextQuestion"
              );
              io.to(game.pin).emit("gameQuestions", {
                q1: currentQuestion.question,
                a1: currentQuestion.answers[0],
                a2: currentQuestion.answers[1],
                a3: currentQuestion.answers[2],
                a4: currentQuestion.answers[3],
                correct: currentQuestion.correct,
                playersInGame: playersInGame.length,
              });
              client.close();
            } else {
              console.log(
                "[DEBUG] No hay más preguntas en nextQuestion. Calculando ranking."
              );
              const playersInGame = players.getPlayers(game.hostId);
              console.log(
                "[DEBUG] Llamando a calculateRanking. Desde: nextQuestion | Hacia: calculateRanking"
              );
              const ranking = calculateRanking(playersInGame);
              console.log(
                "[DEBUG] Emitiendo GameOver a sala:",
                game.pin,
                "con ranking:",
                ranking
              );
              io.to(game.pin).emit("GameOver", ranking);
            }
          });
      });
      console.log(
        "[DEBUG] Emitiendo nextQuestionPlayer a sala:",
        game.pin,
        "desde nextQuestion"
      );
      io.to(game.pin).emit("nextQuestionPlayer");
    });

    socket.on("startGame", () => {
      console.log("[DEBUG] Evento 'startGame' recibido en socket:", socket.id);
      console.log(
        "[DEBUG] Llamando a games.getGame. Desde: startGame | Hacia: games.getGame con socket id:",
        socket.id
      );
      const game = games.getGame(socket.id);
      game.gameLive = true;
      console.log(
        "[DEBUG] Emitiendo gameStarted al socket:",
        socket.id,
        "con hostId:",
        game.hostId
      );
      socket.emit("gameStarted", game.hostId);
    });

    // ---------- Eventos adicionales ----------
    socket.on("requestDbNames", () => {
      console.log(
        "[DEBUG] Evento 'requestDbNames' recibido en socket:",
        socket.id
      );
      console.log(
        "[DEBUG] Llamando a MongoClient.connect. Desde: requestDbNames | Hacia: MongoDB"
      );
      MongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        console.log("[DEBUG] Conexión a MongoDB exitosa en requestDbNames");
        const dbo = client.db(kahootDB);
        console.log(
          "[DEBUG] Llamando a dbo.collection.find. Desde: requestDbNames | Hacia: DB"
        );
        dbo
          .collection(kahootCollection)
          .find()
          .toArray((err, resArr) => {
            if (err) throw err;
            console.log(
              "[DEBUG] Emitiendo gameNamesData al socket:",
              socket.id
            );
            socket.emit("gameNamesData", resArr);
            console.log(
              "[DEBUG] Cerrando conexión a MongoDB en requestDbNames"
            );
            client.close();
          });
      });
    });

    socket.on("newQuiz", (data) => {
      console.log(
        "[DEBUG] Evento 'newQuiz' recibido en socket:",
        socket.id,
        "con data:",
        data
      );
      console.log(
        "[DEBUG] Llamando a MongoClient.connect. Desde: newQuiz | Hacia: MongoDB"
      );
      MongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        console.log("[DEBUG] Conexión a MongoDB exitosa en newQuiz");
        const dbo = client.db(kahootDB);
        console.log(
          "[DEBUG] Llamando a dbo.collection.find. Desde: newQuiz | Hacia: DB"
        );
        dbo
          .collection(kahootCollection)
          .find({})
          .toArray((err, result) => {
            if (err) throw err;
            let num = Object.keys(result).length;
            data.id = num == 0 ? 1 : result[num - 1].id + 1;
            console.log(
              "[DEBUG] Llamando a dbo.collection.insertOne. Desde: newQuiz | Hacia: DB con data:",
              data
            );
            dbo.collection(kahootCollection).insertOne(data, (err, res) => {
              if (err) throw err;
              console.log(
                "[DEBUG] Nuevo quiz insertado. Cerrando conexión a MongoDB en newQuiz"
              );
              client.close();
            });
            console.log(
              "[DEBUG] Emitiendo startGameFromCreator al socket:",
              socket.id,
              "con num:",
              num
            );
            socket.emit("startGameFromCreator", num);
          });
      });
    });
  });
};
