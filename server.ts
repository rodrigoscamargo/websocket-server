import WebSocket, { WebSocketServer } from "ws";

const port = 1234;
const wss = new WebSocketServer({ port });
const maxClients = 2;
let rooms: Map<string, Array<Player>> = new Map<string, Array<Player>>();

interface Message {
    type: string;
    params?: Params
}

interface Params {
    room?: string,
    player?: Player,
    tictactoe?: TicTacToe;
}

interface Player {
    id: string,
    name?: string,
    piece?: string,
    websocket?: WebSocket,
}

interface TicTacToe {
    position: number
}

enum PieceType {
    X = 'X',
    O = 'O'
  }

function replacer(key: string, value: any) {
    if (key === 'websocket') {
        return undefined;
    }
    if (key === 'tictactoe') {
        return undefined;
    }
    return value;
}

wss.on('connection', (ws) => {

    ws.on('message', (data) => {
        console.table(data.toString());
        const message: Message = JSON.parse(data.toString());

        switch (message.type) {
            case "create":
                create(message.params!);
                break;
            case "join":
                join(message.params!);
                break;
            case "leave":
                leave(message.params!);
                break;

            case "choose":
                choose(message.params!);
                break;
            case "game":
                game(message.params!);
                break;
            default:
                console.warn(`Type: ${message.type} unknown`);
                break;
        }
    })

    function create(params: Params) {
        const room = genKey(5);

        let player = params.player;

        player!.websocket = ws;

        console.log(`Room created: ${room}`)
        rooms.set(room, [player!]);

        generalInformation(ws, { room: room });
    }

    function join(params: Params) {
        const room = params.room;

        const player = params.player;

        player!.websocket = ws;

        let activeRoom = rooms.get(room!);

        if (!activeRoom) {
            console.warn(`Room ${room} does not exist!`);
            return;
        }

        if (activeRoom!.length >= maxClients) {
            console.warn(`Room ${room} is full!`);
            ws.send(JSON.stringify({ type: 'info', params: {} }))
            return;
        }

        const whoChoosesThePiece: number = Math.floor((Math.random()));

        activeRoom.push(player!);

        if (whoChoosesThePiece == 0) {

            const ready: Message = { type: 'ready', params: { player: activeRoom[0] } }
            const readyToChoose: Message = { type: 'readyToChoose', params: { player: activeRoom[1] } }

            activeRoom[0].websocket?.send(JSON.stringify(readyToChoose, replacer));
            activeRoom[1].websocket?.send(JSON.stringify(ready, replacer));
        } else {

            const ready: Message = { type: 'ready', params: { player: activeRoom[1] } }
            const readyToChoose: Message = { type: 'readyToChoose', params: { player: activeRoom[0] } }

            activeRoom[0].websocket?.send(JSON.stringify(ready, replacer));
            activeRoom[1].websocket?.send(JSON.stringify(readyToChoose, replacer));
        }

    }

    function leave(params: Params) {

        if (!rooms.get(params.room!)) {
            const message: Message = { type: 'close' }

            rooms.get(params.room!)!.forEach(player => player.websocket!.send(JSON.stringify(message, replacer)));
            rooms.delete(params.room!);
        }
    }

    function choose(params: Params) {

        let activeRoom = rooms.get(params.room!);


        if (!activeRoom) {
            return;
        }

        const playerIndex = activeRoom.findIndex(player => player.id == params.player?.id);
        activeRoom[playerIndex].piece = params.player?.piece;

        //Informar os sobre a peca do oponente
    }

    function game(params: Params) {
        const room = rooms.get(params.room!);
        const currentPlayer = params.player!;

        const nextPlayerIndex = room!.findIndex((player) => player.id !== currentPlayer.id);

        const currentPlay: Message = { type: 'game', params: { tictactoe: params.tictactoe!, }, };

        if (nextPlayerIndex) {
            room![nextPlayerIndex].websocket!.send(JSON.stringify(currentPlay));
            return;
        }
    }
})


function generalInformation(ws: WebSocket, params: Params) {
    let obj;

    if (rooms !== undefined) {
        obj = {
            "type": "info",
            "params": {
                "room": params.room,
                "no-clients": rooms.get(params.room!)!.length,
            }
        }
    }
    else {
        obj = {
            "type": "info",
            "params": {
                "room": "no room",
            }
        }
    }

    ws.send(JSON.stringify(obj));
}

function genKey(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length));
    }
    return result;
}

console.log(`Listening at ${port}...`);

