const SOEProtocol = require("./SOEProtocol");
const dgram = require('dgram');
const config = require('./config');
const verboseSWGLogging = config.SWG.verboseSWGLogging;

var server = {};
module.exports.login = function(cfg) {
    server = cfg;
    Login();
}
module.exports.isConnected = false;
module.exports.paused = false;
module.exports.sendChat = function(message, user) {
    if (!module.exports.isConnected) return;
    if (verboseSWGLogging) console.log(getFullTimestamp() + " - sending chat to game: " + user + ": " + message);
    send("ChatSendToRoom", {Message: ' \\#ff3333' + user + ': \\#ff66ff' + message, RoomID: server.ChatRoomID});
}
module.exports.recvChat = function(message, player) {}
module.exports.serverDown = function() {}
module.exports.serverUp = function() {}
module.exports.reconnected = function() {}
module.exports.sendTell = function(player, message) {
    if (!module.exports.isConnected) return;
    if (player != config.SWG.Character)
    	console.log(getFullTimestamp() + " - sending tell to: " + player + ": " + message);
    send("ChatInstantMessageToCharacter", {ServerName: server.ServerName, PlayerName: player, Message: message});
}
module.exports.recvTell = function(from, message) {}

var lastMessageTime = new Date();
function handleMessage(msg, info) {
    lastMessageTime = new Date();
    if (info.port == server.PingPort) return;
    var packets;
    try {
        var header = msg.readUInt16BE(0);
        packets = SOEProtocol.Decode(msg);
    } catch (ex) {
        console.log(getFullTimestamp() + " - Exception with header: " + header.toString(16).toUpperCase().padStart(4, 0))
        console.log(getFullTimestamp() + " - " + ex.toString());
        Login();
        return;
    }
    if (!packets) return;
    for (var packet of packets) {
        if (verboseSWGLogging) console.log(getFullTimestamp() + " - recv: " + packet.type);
        if (handlePacket[packet.type])
            handlePacket[packet.type](packet);
    }
}

var socket;
var loggedIn;

var handlePacket = {};
handlePacket["Ack"] = function(packet) {}   //This is Ack packet from server, no response required
handlePacket["SessionResponse"] = function(packet) {
    if (!loggedIn) {
        send("LoginClientID", {Username: server.Username, Password:server.Password});
    }
    else {
        send("ClientIdMsg");
    }
}
handlePacket["LoginClientToken"] = function(packet) {
    console.log(getFullTimestamp() + " - Logged into SWG login server");
    loggedIn = true;
}
handlePacket["LoginEnumCluster"] = function(packet) {
    server.ServerNames = packet.Servers;
}
handlePacket["LoginClusterStatus"] = function(packet) {
    if (verboseSWGLogging) console.log(packet);
    server.Servers = packet.Servers;
}
handlePacket["EnumerateCharacterId"] = function(packet) {
    var character = packet.Characters[server.Character];
    if (!character)
        for (var c in packet.Characters)
            if (packet.Characters[c].Name.startsWith(server.Character))
                character = packet.Characters[c];
    var serverData = server.Servers[character.ServerID];
    server.Address = serverData.IPAddress;
    server.Port = serverData.Port;
    server.PingPort = serverData.PingPort;
    server.CharacterID = character.CharacterID;
    server.ServerName = server.ServerNames[character.ServerID].Name;
    send("SessionRequest");
}
handlePacket["ClientPermissions"] = function(packet) {
    send("SelectCharacter", {CharacterID: server.CharacterID});
    setTimeout(() => {
        send("ChatCreateRoom", {RoomPath: `SWG.${server.ServerName}.${server.ChatRoom}`})
        setTimeout(() => send("CmdSceneReady"), 1000);
    }, 1000);
}
handlePacket["ChatRoomList"] = function(packet) {
    if (verboseSWGLogging) console.log(JSON.stringify(packet, null, 2));
    for (var roomID in packet.Rooms) {
        var room = packet.Rooms[roomID];
        if (room.RoomPath.endsWith(server.ChatRoom)) {
            server.ChatRoomID = room.RoomID;
            send("ChatEnterRoomById", {RoomID: room.RoomID});
        }
    }
}
handlePacket["ChatOnEnteredRoom"] = function(packet) {
    if (verboseSWGLogging) console.log(JSON.stringify(packet, null, 2));
    if (packet.RoomID == server.ChatRoomID && packet.PlayerName == server.Character) {
        if (!module.exports.isConnected) {
            module.exports.isConnected = true;
            console.log(getFullTimestamp() + " - Logged into SWG and entered chatroom");
            module.exports.reconnected();
        }
        if (fails >= 3) module.exports.serverUp();
        fails = 0;
    }
}
handlePacket["ChatRoomMessage"] = function(packet) {
    if (verboseSWGLogging) console.log(JSON.stringify(packet, null, 2));
    if (packet.RoomID == server.ChatRoomID && packet.CharacterName != server.Character.toLowerCase())
        module.exports.recvChat(packet.Message, packet.CharacterName);
}
handlePacket["ChatInstantMessageToClient"] = function(packet) {
    module.exports.recvTell(packet.PlayerName, packet.Message);
}
//handlePacket["Disconnect"] = function(packet) {}  //Not sure what to do with disconnect from server
//handlePacket["ServerNetStatusUpdate"] = function(packet) {} //This is network status packet from server, no response required

function Login() {
    loggedIn = false;
    module.exports.isConnected = false;

    server.Address = server.LoginAddress; 
    server.Port = server.LoginPort;
    server.PingPort = undefined;    //Undefined until we get ping port from login server

    socket = dgram.createSocket('udp4');
    socket.on('message', handleMessage);

    send("SessionRequest");
}

function send(type, data) {
    var buf = SOEProtocol.Encode(type, data);
    if (buf) {
        if (verboseSWGLogging) console.log(getFullTimestamp() + " - send: " + type);
        if (Array.isArray(buf)) {
            for (var b of buf) {
                socket.send(b, server.Port, server.Address);
            }
        }
        else
            socket.send(buf, server.Port, server.Address);
    }
}

var fails = 0;
setInterval(() => {
    if (module.exports.paused) return;
    send("Ack");
    if (new Date() - lastMessageTime > 10000) {
        fails++;
        module.exports.isConnected = false;
        if (fails == 3) module.exports.serverDown();
        lastMessageTime = new Date();
        Login();
    }
}, 100);

setInterval(() => {
    if (!server.PingPort || !module.exports.isConnected)
        return;
    var buf = Buffer.alloc(4);                          //Server requires 4 byte packet, going to have it match what standard client sends, not what is in the documentation
    var tick = new Date().getTime() & 0xFFFF;           //Convert to uint16 
    buf.writeUInt16BE(tick, 0);                         //Big or Little Endian?  Doesn't matter right now.
    buf.writeUInt16BE(0x7701, 2);                       //77 01 matches client ping
    //console.log("Hex: " + buf.toString('hex'));
    socket.send(buf, server.PingPort, server.Address);  //Send to the ping server IP and port
}, 1 * 1000);                                           //Let's send a ping every 1.0 seconds like the client

setInterval(() => {
    if (!module.exports.isConnected) return;
	send("ClientNetStatusRequest");                     //Going to send a net status packet every 15 seconds (standard client is 15)
}, 15 * 1000);

 //Custom timestamp generator
 function getFullTimestamp() {

    date = new Date();
    year = date.getFullYear().toString().padStart(4, '0') + "-";
    month = (date.getMonth()+1).toString().padStart(2, '0') + "-";
    day = date.getDate().toString().padStart(2, '0') + " ";
    hours = date.getHours().toString().padStart(2, '0') + ":";
    minutes = date.getMinutes().toString().padStart(2, '0') + ":";
    seconds = date.getSeconds().toString().padStart(2, '0') + ".";
    millisecs = date.getMilliseconds().toString().padStart(3, '0');

    return year + month + day + hours + minutes + seconds + millisecs;
}