import WebSocket, { WebSocketServer } from "ws";

const port = 1234;
const wss = new WebSocketServer({ port });
const maxClients = 2;
let rooms: Map<string, Array<WebSocket>> = new Map<string, Array<WebSocket>>();

interface Message {
    type: string;
    params?: Params
}

interface Params {
    room: string,
}

wss.on('connection', (ws) => {

    ws.on('message', (data) => {
        let message: Message = JSON.parse(data.toString());

        switch (message.type) {
            case "create":
                create();
                break;
            case "join":
                join(message.params!);
                break;
            case "leave":
                leave(message.params!);
                break;
            case "game":
                leave(message.params!);
                break;
            default:
                console.warn(`Type: ${message.type} unknown`);
                break;
        }
    })

    function create() {
        const room = genKey(5);
        console.log(`Room created: ${room}`)
        rooms.set(room, [ws]);

        generalInformation(ws, { room: room });
    }

    function join(params: Params) {
        const room = params.room;

        console.log(`Active rooms: ${rooms.size}`)

        if (!rooms.get(room)) {
            console.warn(`Room ${room} does not exist!`);
            return;
        }

        if ((rooms.get(params.room))!.length >= maxClients) {
            console.warn(`Room ${room} is full!`);
            return;
        }

        rooms.get(params.room)!.push(ws);

        generalInformation(ws, params);

        rooms.get(params.room)!.forEach(ws => ws.send(JSON.stringify({ "type": "ready" })))
    }

    function leave(params: Params) {

        if (!rooms.get(params.room)) {
            rooms.get(params.room)!.forEach(ws => ws.send(JSON.stringify({
                "type": "close", "params": {
                    "room": params.room,

                }
            })));
            rooms.delete(params.room);
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
                "no-clients": rooms.get(params.room)!.length,
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

