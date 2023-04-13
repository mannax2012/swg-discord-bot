#!/bin/bash
cd /home/infinity/workspace/chatbot 
pm2 start discordbot.js -o ./console.log -e ./error.log
