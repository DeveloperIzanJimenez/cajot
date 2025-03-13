// Definición de la clase LiveGames para gestionar los juegos en vivo
class LiveGames {
    // Constructor: inicializa el array que almacenará los juegos en curso
    constructor () {
        this.games = []; // Array donde se guardarán los objetos juego
    }

    // Método addGame: agrega un nuevo juego a la lista de juegos en vivo
    // Parámetros:
    //   pin: código de acceso (pin) del juego
    //   hostId: id del host que inicia el juego (por ejemplo, socket.id)
    //   gameLive: booleano que indica si el juego está activo
    //   gameData: objeto con datos del juego (número de pregunta, jugadores respondieron, etc.)
    addGame(pin, hostId, gameLive, gameData){
        // Se crea un objeto juego con las propiedades indicadas
        var game = {pin, hostId, gameLive, gameData};
        // Se añade el juego al array de juegos en vivo
        this.games.push(game);
        // Se retorna el juego añadido
        return game;
    }

    // Método removeGame: elimina un juego de la lista usando el hostId
    // Parámetros:
    //   hostId: id del host cuyo juego se quiere eliminar
    removeGame(hostId){
        // Se obtiene el juego usando el hostId
        var game = this.getGame(hostId);
        
        // Si se encontró el juego, se filtra el array para quitarlo
        if(game){
            this.games = this.games.filter((game) => game.hostId !== hostId);
        }
        // Se retorna el juego eliminado (o undefined si no se encontró)
        return game;
    }

    // Método getGame: retorna el juego cuyo hostId coincide con el solicitado
    // Parámetros:
    //   hostId: id del host del juego que se desea obtener
    getGame(hostId){
        // Se filtra el array de juegos y se retorna el primero que coincida con el hostId
        return this.games.filter((game) => game.hostId === hostId)[0];
    }
}

// Exporta la clase LiveGames para poder usarla en otros módulos
module.exports = {LiveGames};
