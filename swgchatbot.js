const Discord = require('discord.js');
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const SWG = require('./swgclient.js');
const config = require('./config.json');
const verboseLogging = config.verboseLogging;
SWG.login(config.SWG);

//Make sure these are global
var server, chat, notif, notifRole, noRole, autoRestartTimer;

const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
});

client.login(config.Discord.BotToken)

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    client.user.setPresence({game: {name:config.Discord.PresenceName}, status: "online"});
    server = client.guilds.cache.get(config.Discord.ServerID);
    chat = client.channels.cache.find(cc => cc.name === config.Discord.ChatChannel);
    notif = client.channels.cache.find(nc => nc.name === config.Discord.NotificationChannel);
    notifRole = server.roles.cache.find(nr => nr.name === config.Discord.NotificationMentionRole);
    noRole = notifRole;
    if (!notifRole) {
        notifRole = config.Discord.NotificationMentionUserID;
    }

    // Restart bot every X minutes if configured
    autoRestartTimer = config.Discord.AutoRestartTimer;
    if (autoRestartTimer) {
        console.log("Scheduling restart in " + autoRestartTimer + " minutes.");
        setTimeout(() => {
            console.log("auto-restarting chat bot");
            process.exit(0);
        }, autoRestartTimer * 60 * 1000);
    }

    // Send a ping to SWG client every 30 seconds
    setInterval(() => SWG.sendTell(config.SWG.Character, "ping"), 30 * 1000);
});

client.on("messageCreate", async (message) => {
    if (message.author.username == config.Discord.BotName) {
        return;
    }
    var sender;
    if (message.channel.name == config.Discord.ChatChannel) {
        sender = server.members.cache.get(message.author.id).displayName;
    }
    else {
        sender = message.author.username;
    }
    if (message.content.startsWith('!server')) {
        message.reply(config.SWG.SWGServerName + (SWG.isConnected ? " is UP!" : " is DOWN :("));
    }
    if (message.content.startsWith('!fixchat')) {
        message.reply("rebooting chat bot");
        console.log("Received !fixchat request from " + sender);
        process.exit(0);
        //setTimeout(() => { process.exit(0); }, 500);
    }
    if (message.content.startsWith('!pausechat')) {
        message.reply(SWG.paused ? "unpausing" : "pausing");
        console.log("Received pausechat request from " + sender);
        SWG.paused = !SWG.paused;
    }

    if (message.channel.name != config.Discord.ChatChannel) {
        return;
    }
    SWG.sendChat(message.cleanContent, sender);
});

client.on('disconnect', event => {
    try {notif.send(config.Discord.BotName + " disconnected");}catch(ex){}
    client = server = notif = chat = notifRole = null;
    console.log("Discord disconnect: " + JSON.stringify(event,null,2));
    //setTimeout(() => { process.exit(0); }, 500);
    process.exit(0);
    //setTimeout(discordBot, 1000);  Not going to automatically connect due to PM2 so will will just exit when bot disconnects
});

SWG.serverDown = function() {
    if (notif) {
        if (noRole) //Have a role, send to that
            prefix = "<@&"
        else
            prefix = "<@"
        notif.send(prefix + notifRole + "> The server " + config.SWG.SWGServerName + " is DOWN!");
    }
}

SWG.serverUp = function() {
    if (notif) {
        if (noRole) //Have a role, send to that
            prefix = "<@&"
        else
            prefix = "<@"
        notif.send(prefix + notifRole + "> The server " + config.SWG.SWGServerName + " is UP!");
    }
}

SWG.recvChat = function(message, player) {
    if (verboseLogging) {
        console.log("sending chat to Discord " + player + ": " + message);
    }
    if (chat) {
        chat.send("**" + player + ":**  " + message);
    }
    else {
        console.log("Discord disconnected");
    }
}

SWG.recvTell = function(from, message) {
    if (from != config.SWG.Character) {
    	console.log("received tell from: " + from + ": " + message);
    	SWG.sendTell(from, "Sorry, I don't talk to strangers ... XOXO");
    }
}