// server/server.js
/**
 * Archivo principal para KahootClone
 * Se encarga de la configuración general, la creación de la app, y de cargar las rutas y eventos.
 */

const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const fs = require("fs");

// Módulos personalizados
const { LiveGames } = require("./utils/liveGames");
const { Players } = require("./utils/players");

// Inicialización de Express y del servidor HTTP
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Rutas de ficheros estáticos
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Instancia de los gestores de juegos y jugadores
const games = new LiveGames();
const players = new Players();

// Asegurarse de que existe la carpeta de uploads
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Cargar las rutas HTTP (por ejemplo, /uploadQuiz)
const quizRoutes = require("./routes/quizRoutes");
app.use("/", quizRoutes);




// Cargar los eventos de Socket.io y pasarle las dependencias necesarias
require("./sockets/socketEvents")(io, games, players);

// Iniciar el servidor
server.listen(3000, () => {
  console.log("Server started on port 3000");
});
