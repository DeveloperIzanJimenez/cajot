// server/utils/pdfConverter.js
/**
 * Convierte un archivo PDF en imágenes (una por diapositiva) y retorna las rutas relativas.
 */

const fs = require("fs");
const path = require("path");
const { promises: fsPromises } = require("node:fs");

async function convertPdfToImages(pdfPath) {
  const { pdf } = await import("pdf-to-img");
  const options = { scale: 3 };
  const fileName = path.basename(pdfPath, path.extname(pdfPath));
  const slidesDir = path.join(path.dirname(pdfPath), fileName);
  if (!fs.existsSync(slidesDir)) {
    fs.mkdirSync(slidesDir, { recursive: true });
  }
  const document = await pdf(pdfPath, options);
  let imagePaths = [];
  let counter = 1;
  for await (const image of document) {
    const outputPath = path.join(slidesDir, `page${counter}.png`);
    await fsPromises.writeFile(outputPath, image);
    const relativePath = path.join("uploads", fileName, `page${counter}.png`);
    imagePaths.push(relativePath);
    counter++;
  }
  return imagePaths;
}

module.exports = { convertPdfToImages };
