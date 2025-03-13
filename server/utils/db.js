// server/utils/db.js
/**
 * Funciones para conectar a la base de datos MongoDB.
 */

/**
 * Obtiene el cliente y la base de datos.
 * @param {string} dbUrl - URL de conexión a MongoDB.
 * @param {string} dbName - Nombre de la base de datos.
 */
async function getDb(dbUrl, dbName) {
    const MongoClient = require("mongodb").MongoClient;
    const client = await MongoClient.connect(dbUrl);
    const db = client.db(dbName);
    return { client, db };
  }
  
  /**
   * Busca un quiz por su id en la colección.
   * @param {number|string} quizId
   * @param {string} dbUrl
   * @param {string} dbName
   * @param {string} collectionName
   */
  async function findQuizById(quizId, dbUrl, dbName, collectionName) {
    const { client, db } = await getDb(dbUrl, dbName);
    const quiz = await db.collection(collectionName).findOne({ id: parseInt(quizId) });
    client.close();
    return quiz;
  }
  
  module.exports = { getDb, findQuizById };
  