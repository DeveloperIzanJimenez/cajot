// server/routes/quizRoutes.js
/**
 * Rutas relacionadas con los quiz.
 * Aquí se implementa el endpoint /uploadQuiz, utilizando las funciones para guardar quiz y convertir PDFs.
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { promises: fsPromises } = require("node:fs");
const multer = require("multer");

// Importar funciones de utilidades
const { getDb } = require("../utils/db");
const { convertPdfToImages } = require("../utils/pdfConverter");

// Configuración de MongoDB y nombres de la DB y colección
const dbUrl = "mongodb://localhost:27017/";
const kahootDB = "kahootDB";
const kahootCollection = "kahootGames";

// Configurar multer para el manejo de ficheros subidos
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Función auxiliar para guardar el quiz en la BD
async function saveQuiz(quizObj) {
  const { client, db } = await getDb(dbUrl, kahootDB);
  await db.collection(kahootCollection).insertOne(quizObj);
  client.close();
}

// Endpoint para subir un quiz con o sin PDF
router.post("/uploadQuiz", upload.single("pdfFile"), async (req, res) => {
  let quizData;
  try {
    quizData = JSON.parse(req.body.quizData);
  } catch (e) {
    return res
      .status(400)
      .json({ success: false, error: "Formato de quizData inválido." });
  }

  if (req.file) {
    const pdfPath = req.file.path;
    try {
      const slides = await convertPdfToImages(pdfPath);
      quizData.slides = slides;
      quizData.interleavedQuestions = {};
      await saveQuiz(quizData);
      // Borrar el PDF temporal
      fs.unlink(pdfPath, (err) => {
        if (err) console.error(err);
      });
      res.json({ success: true, quiz: quizData });
    } catch (err) {
      console.error("Error al procesar el PDF:", err);
      res.status(500).json({ success: false, error: "Error al procesar el PDF." });
    }
  } else {
    quizData.slides = [];
    quizData.interleavedQuestions = {};
    await saveQuiz(quizData);
    res.json({ success: true, quiz: quizData });
  }
});

module.exports = router;
