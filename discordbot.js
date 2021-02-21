const Discord = require('discord.js');
const Intents = require('discord.js');
const SWG = require('./swgclient');
const config = require('./config');
const verboseLogging = config.verboseLogging;
SWG.login(config.SWG);

var client, server, notif, chat, notifRole;
function discordBot() {
    //client = new Discord.Client();
    client = new Discord.Client({ws:{intents:Intents.ALL}});

    client.on('message', message => {
	var sender;
	if (message.channel.name == config.Discord.ChatChannel)
		sender = server.members.get(message.author.id).displayName;
	else
		sender = message.author.username;
        if (message.content.startsWith('!server')) {
            message.reply(config.SWG.SWGServerName + (SWG.isConnected ? " is UP!" : " is DOWN :("));
        }
        if (message.content.startsWith('!fixchat')) {
            message.reply("rebooting chat bot");
	    console.log("Received !fixchat request from " + sender);
	    setTimeout(() => { process.exit(0); }, 500);
        }
        if (message.content.startsWith('!pausechat')) {
            message.reply(SWG.paused ? "unpausing" : "pausing");
	    console.log("Received 1pausechat request from " + sender);
            SWG.paused = !SWG.paused;
        }
        if (message.channel.name != config.Discord.ChatChannel) return;
        if (message.author.username == config.Discord.BotName) return;
	SWG.sendChat(message.cleanContent, sender);
    });

    client.on('disconnect', event => {
        try {notif.send(config.Discord.BotName + " disconnected");}catch(ex){}
        client = server = notif = chat = notifRole = null;
        console.log("Discord disconnect: " + JSON.stringify(event,null,2));
        setTimeout(discordBot, 1000);
    });

    client.login(config.Discord.BotToken)
        .then(t => {
	    client.user.setPresence({game: {name:config.Discord.PresenceName}, status: "online"});
	    server = client.guilds.find(g => g.name === config.Discord.ServerName);
//	    let test = server.members.find(m => m.displayName === "MrObvious");
//	    console.log("Find Test = " + test);
	    notif = server.channels.find(c => c.name === config.Discord.NotificationChannel);
	    chat = server.channels.find(c => c.name === config.Discord.ChatChannel);	
            notifRole = server.roles.find(r => r.name === config.Discord.NotificationMentionRole);
	    if (!notifRole) notifRole = "<@" + config.Discord.NotificationMentionUserID + ">"; 
        })
        .catch(reason => {
            console.log(reason);
            setTimeout(discordBot, 1000);
        });
}

discordBot();

SWG.serverDown = function() {
    if (notif) notif.send(notifRole + " The server " + config.SWG.SWGServerName + " is DOWN!");
}

SWG.serverUp = function() {
    if (notif) notif.send(notifRole + " The server " + config.SWG.SWGServerName + " is UP!");
}

SWG.recvChat = function(message, player) {
    if (verboseLogging) console.log("sending chat to Discord " + player + ": " + message);
    if (chat) chat.send("**" + player + ":**  " + message);
    else console.log("discord disconnected");
}

SWG.recvTell = function(from, message) {
    if (from != config.SWG.Character) {
    	console.log("received tell from: " + from + ": " + message);
    	SWG.sendTell(from, "Sorry, I don't talk to strangers ... XOXO");
    }
}

setInterval(() => SWG.sendTell(config.SWG.Character, "ping"), 30000);
