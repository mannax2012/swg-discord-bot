#!/bin/bash
cd /home/PATH/TO/BOT
pm2 start swgchatbot.js --name chatbot --time --exp-backoff-restart-delay=100 -o ./console.log -e ./error.log
