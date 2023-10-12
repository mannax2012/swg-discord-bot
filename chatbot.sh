#!/bin/bash
cd /home/infinity/workspace/chatbot 
pm2 start swgchatbot.js --exp-backoff-restart-delay=100 -o ./console.log -e ./error.log
