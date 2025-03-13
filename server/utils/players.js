// Definición de la clase Players para gestionar a los jugadores en el juego
class Players {
    // Constructor: inicializa el array que almacenará los jugadores
    constructor () {
        this.players = []; // Array donde se guardarán los objetos jugador
    }

    // Método addPlayer: agrega un nuevo jugador a la lista
    // Parámetros:
    //   hostId: id del host al que pertenece el jugador
    //   playerId: id único del jugador (por ejemplo, socket.id)
    //   name: nombre del jugador
    //   gameData: objeto con datos relacionados al juego (puntaje, respuesta, etc.)
    addPlayer(hostId, playerId, name, gameData){
        // Se crea un objeto jugador con las propiedades pasadas
        var player = {hostId, playerId, name, gameData};
        // Se añade el jugador al array de jugadores
        this.players.push(player);
        // Se retorna el jugador añadido
        return player;
    }

    // Método removePlayer: elimina un jugador de la lista usando su playerId
    // Parámetros:
    //   playerId: id único del jugador a eliminar
    removePlayer(playerId){
        // Se obtiene el jugador usando su id
        var player = this.getPlayer(playerId);
        
        // Si el jugador existe, se filtra el array para quitarlo
        if(player){
            this.players = this.players.filter((player) => player.playerId !== playerId);
        }
        // Se retorna el jugador eliminado (o undefined si no se encontró)
        return player;
    }

    // Método getPlayer: retorna el jugador cuyo playerId coincide con el solicitado
    // Parámetros:
    //   playerId: id único del jugador que se desea obtener
    getPlayer(playerId){
        // Se filtra el array de jugadores y se retorna el primero que coincida con el id
        return this.players.filter((player) => player.playerId === playerId)[0];
    }

    // Método getPlayers: retorna todos los jugadores que pertenecen a un host determinado
    // Parámetros:
    //   hostId: id del host del juego del cual se quieren obtener los jugadores
    getPlayers(hostId){
        // Se filtra el array de jugadores para obtener aquellos cuyo hostId coincide
        return this.players.filter((player) => player.hostId === hostId);
    }
}

// Exporta la clase Players para que pueda ser utilizada en otros módulos
module.exports = {Players};
