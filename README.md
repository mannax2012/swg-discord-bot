# Progor-Chat

Progor-Chat is a custom Discord and SWGEMU client that links the two platforms together.  Like Core3 is an SWG Server emulator, Progor-Chat acts as an SWG Client emulator.  It sends the same packets the client would to login and select a character, then ignores all the packets the server sends about the world around the character, and only listens for packets related to Chat.  When it receives chats in the channel specified, it forwards the content of those messages to the Discord client to post in it's specified channel.  It also does the reverse - listens for Discord messages and posts them in the in-game chat channel.

Since it's constantly in communication with the game server, it knows quickly when the server goes down.  It will then post a message to a separate channel (can be the same or different) and mention a Discord role - usually your staff / admin role - to quickly notify someone who can get the server back up.

## Getting Started

First, create a Discord bot.  Go to https://discordapp.com/developers, fill out the name of your bot/app, make it public, give it a profile photo if you want, and save it.  You don't need OAuth2 or Redirect URIs.  This will give you the name and token you need later.

Then, invite the bot to your server.  Use this link: https://discordapp.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot but replace the Client_ID with the Client ID from the bot you just created.

Then, create a new game account (or use an existing non-admin account with a free character slot), with a character whose name will be present on every message that comes from Discord.  Relics of Corbantis named ours Discord.  Log into this character, and leave them at the end of the tutorial in the instanced room where you select a planet.  This is the quietest place in the galaxy (fewer stray packets to deal with), and a great place for aspiring bots to hide out.  Finally, have this bot join the chat room you wish for it to speak in, and log out of your game client.  For now, any time the server is rebooted, you'll need to stop the bot, log back into the character long enough for the client to join the channel, log back out, and restart the bot.  This issue should be fixed in an upcoming release.  One further note about the bot: it should NOT be an admin.  Admin characters have additional text added to their chats, so the bot can't pick out it's own messages and ends up reposting them to Discord.  If a feature is added which requires an admin, additional config will be put in place to solve this issue.

Download this repository to a folder.  cd to that folder and run

```sh
npm install
```

to install the necessary dependencies (like the Discord client).

Create a file named config.json with these values populated with your server, account, character, and chat room / channel specifics.  You can copy config.example.json to get you started.
For instance:
```json
{
    "SWG": {
        "LoginAddress": "SWGserveraddress",
	"SWGServerName": "SWG Server Name",
        "LoginPort": 44453,
	"PingPort" : 7,
        "Username": "SWG Account Name",
        "Password": "SWG Account Password",
        "Character": "SWG Bot Character",
        "ChatRoom": "SWG.SWG Server Name.GeneralChatRoomName"
    },
    "Discord": {
        "BotName": "SWG Chat Bot",
        "PresenceName": "Application Name to Display in Discord",
        "BotToken": "Bot token from Discord App Page",
        "ServerID": "Discord Server ID",
        "ChatChannel": "chatchannel",
        "NotificationChannel": "staffchannel",
        "NotificationMentionRole": "staff",
	"NotificationMentionUserID": "If role is left blank, you can put a Discord user ID here to notify a single user"
    },
    "verboseLogging": false
}

```

| Field | Explanation |
| ------ | ------ |
| SWG.LoginAddress | The Address of the SWGEmu login server.  This is what you point your launcher at. |
| SWG.SWGServerName| Uses for messages in the app |
| SWG.LoginPort | The Port of the SWGEmu login server.  This is usually 44453 |
"PingPort" : 7,  Ping port for SWG server |
| SWG.Username | The Username you type in the SWG splash screen. |
| SWG.Password | The Password you type in the SWG splash screen. |
| SWG.Character | The Character you choose on the character select screen.  First name only.  Case matters. |
| SWG.ChatRoom | The name of the ChatRoom it should replicate to/from.  If nested in the tree, use dots, i.e. Chat.General.Main |
| Discord.BotName | The App Name of the Bot you created in discordapp.com/developers |
| Discord.PresenceName | The bot will show "Playing PresenceName" |
| Discord.BotToken | The App Bot User Token from the discordapp Bot page |
| Discord.ServerID | The server ID of the Discord server the Bot is monitoring |
| Discord.ChatChannel | The name of the Discord channel the Bot should replicate to/from |
| Discord.NotificationChannel | The name of the Discord channel that server up/down events should be posted to |
| Discord.NotificationMentionRole | The name of the role that should be mentioned in up/down notifications |
| Discord.NotificationMentionUserID| If role is left blank, you can put a Discord user ID here to notify a single user |
| verboseLogging| Enable or disable verbose console logging |

Finally run the bot with:

```sh
node discordbot.js
```

Better yet, to handle any unexpected errors get forever or PM2

```sh
sudo npm install forever -g
```

or

```sh
sudo npm install pm2 -g
```

and run with

```sh
forever start discordbot.js
```

or

```sh
pm2 start discordbot.js
```

Any issues?  Please report to SWG Infinity developer team.