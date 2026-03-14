#!/bin/bash

response=$(curl -sS -d 'login=bodiasynytskiy@gmail.com&password=123' http://localhost:8080/login)
token=$(echo "$response" | jq -r '.token')

response=$(curl -sS -H "Authorization: Bearer $token" http://localhost:8080/chats)
chat_id=$(echo $response | jq -r '.[0] | .chat_id')

response=$(curl -sS -H "Authorization: Bearer $token" http://localhost:8080/chats/$chat_id)
echo $response | jq -r '.[]'
