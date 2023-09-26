const Discord = require('discord.js');
const { Client, Events, GatewayIntentBits, Partials, ActivityType, ChannelType } = require('discord.js');
const SWG = require('./swgclient.js');
const config = require('./config.json');
const verboseDiscordLogging = config.Discord.verboseDiscordLogging;
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
    client.user.setPresence({ activities: [{ name: config.Discord.PresenceName, type: ActivityType.Watching }], status: 'online' });
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

    // Send a tell to SWG client every 30 seconds.   Doesn't seem to be needed anymore
    //setInterval(() => SWG.sendTell(config.SWG.Character, "ping"), 30 * 1000);
});

client.on("messageCreate", async (message) => {

    if (verboseDiscordLogging) {
        console.log("message.author.username = " + message.author.username);
        console.log("message.channel.name = " + message.channel.name);
        console.log("message.channel.type = " + message.channel.type);
    }

    if (message.author.username == config.Discord.BotName) {
        return;
    }

    if (message.channel.type === ChannelType.DM) { // Ignore DMs
        return;
    }

    if (message.channel.name != config.Discord.ChatChannel && message.channel.name != config.Discord.NotificationChannel) {
        return;
    }

    var sender = server.members.cache.get(message.author.id).displayName;    // Get server displayName, if not available will use global displayName

    if (verboseDiscordLogging) {
        console.log("sender = " + sender);
        console.log("message.author.username = " + message.author.username);
        //console.log("message.author.global_name = " + message.author.global_name);
        console.log("message.content = " + message.content);
    }

    var messageContent = message.content.toLowerCase();
    if (messageContent.startsWith('!server')) {
        message.reply(config.SWG.SWGServerName + (SWG.isConnected ? " is UP!" : " is DOWN :("));
    }
    if (messageContent.startsWith('!fixchat')) {
        message.reply("rebooting chat bot");
        console.log("Received !fixchat request from " + sender);
        setTimeout(() => { process.exit(0); }, 500);  //Exit in 500 ms, allow time for reply to be sent
    }
    if (messageContent.startsWith('!pausechat')) {
        message.reply(SWG.paused ? "unpausing" : "pausing");
        console.log("Received pausechat request from " + sender);
        SWG.paused = !SWG.paused;
    }

    if (message.channel.name != config.Discord.ChatChannel) { // Only send specific chat channel text to SWG
        return;
    }

    SWG.sendChat(message.cleanContent, sender);
});

client.on('disconnect', event => {
    try {notif.send(config.Discord.BotName + " disconnected");}catch(ex){}
    client = server = notif = chat = notifRole = null;
    console.log("Discord disconnect: " + JSON.stringify(event,null,2));
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
    if (verboseDiscordLogging) {
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