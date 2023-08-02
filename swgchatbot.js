const Discord = require('discord.js');
const { Client, Events, GatewayIntentBits, Partials, ActivityType, ChannelType } = require('discord.js');
const SWG = require('./swgclient.js');
const config = require('./config.json');
const verboseLogging = config.verboseLogging;
SWG.login(config.SWG);

//Make sure these are global
var server, chatChannel, notifChannel, notifRole, noRole, autoRestartTimer;

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
client.on('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: config.Discord.PresenceName, type: ActivityType.Watching }], status: 'online' });
    server = client.guilds.cache.get(config.Discord.ServerID);
    chatChannel = client.channels.cache.get(config.Discord.ChatChannelID);
    notifChannel = client.channels.cache.get(config.Discord.NotificationChannelID);
    notifRole = server.roles.cache.get(config.Discord.NotificationRoleID);
    noRole = notifRole;
    if (!notifRole) {
        notifRole = config.Discord.NotificationUserID;
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
    if (message.author.id == config.Discord.BotID) { //Ignore messages from self
        return;
    }
	
	if (message.channel.type === ChannelType.DM) { //Ignore DMs
        return;
    }
	
	if (message.channel.id != config.Discord.ChatChannelID) { //Ignore all channels apart from the specified chat channel
        return;
    }
	
    var sender = server.members.cache.get(message.author.id).displayName;
	
	let lowerCaseMessageContent = message.content.toLowerCase();
    if (lowerCaseMessageContent.startsWith('!server')) {
        message.reply(config.SWG.SWGServerName + (SWG.isConnected ? " is UP!" : " is DOWN :("));
    }
    if (lowerCaseMessageContent.startsWith('!fixchat')) {
        message.reply("rebooting chat bot");
        console.log("Received !fixchat request from " + sender);
        process.exit(0);
        setTimeout(() => { process.exit(0); }, 500); //Exit in 500 ms, allow time for reply to be sent
    }
    if (lowerCaseMessageContent.startsWith('!pausechat')) {
        message.reply(SWG.paused ? "unpausing" : "pausing");
        console.log("Received pausechat request from " + sender);
        SWG.paused = !SWG.paused;
    }

    SWG.sendChat(message.cleanContent, sender);
});

client.on('disconnect', event => {
    try { notifChannel.send("Bot ID: " + config.Discord.BotID + " disconnected"); } catch (ex) { }
    client = server = notifChannel = chatChannel = notifRole = null;
    console.log("Discord disconnect: " + JSON.stringify(event, null, 2));
    //setTimeout(() => { process.exit(0); }, 500);
    process.exit(0);
    //setTimeout(discordBot, 1000);  Not going to automatically connect due to PM2 so will will just exit when bot disconnects
});

SWG.serverDown = function () {
    if (notifChannel) {
        if (noRole) //Have a role, send to that
            prefix = "<@&"
        else
            prefix = "<@"
        notifChannel.send(prefix + notifRole + "> The " + config.SWG.SWGServerName + " server is DOWN!");
    }
    if (chatChannel) {
        chatChannel.send("The " + config.SWG.SWGServerName + " server is offline!");
    }
}

SWG.serverUp = function () {
    if (notifChannel) {
        if (noRole) //Have a role, send to that
            prefix = "<@&"
        else
            prefix = "<@"
        notifChannel.send(prefix + notifRole + "> The " + config.SWG.SWGServerName + " server is UP!");
    }
    if (chatChannel) {
        chatChannel.send("The " + config.SWG.SWGServerName + " server is online!");
    }
}

SWG.recvChat = function (message, player) {
    if (verboseLogging) {
        console.log("sending chat to Discord " + player + ": " + message);
    }
    if (chatChannel) {
        chatChannel.send("**" + player + ":**  " + message);
    }
    else {
        console.log("Discord disconnected");
    }
}

SWG.recvTell = function (from, message) {
    if (from != config.SWG.Character) {
        console.log("received tell from: " + from + ": " + message);
        SWG.sendTell(from, "Sorry, I don't talk to strangers ... XOXO");
    }
}