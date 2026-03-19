#!/bin/bash

response=$(curl -sS -d 'login=user@test.com&password=123' http://localhost:8080/login)
token=$(echo "$response" | jq -r '.token')

response=$(curl -sS -H "Authorization: Bearer $token" http://localhost:8080/chats)
chat_id=$(echo $response | jq -r '.[0] | .chat_id')

curl -sS -v -i -H "Authorization: Bearer $token" \
                    -H "Connection: Upgrade" \
                    -H "Upgrade: websocket" \
                    -H "Sec-WebSocket-Key: W8cIQLwzKOiMLXuWqXOnhg==" \
                    -H "Sec-WebSocket-Version: 13" http://localhost:8080?chat_id=$chat_id
