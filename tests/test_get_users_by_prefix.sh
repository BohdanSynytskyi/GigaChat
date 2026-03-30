#!/bin/bash

curl -sS -d 'login=user@test.com&password=123' -c /tmp/store_here.txt http://localhost:8080/login

response=$(curl -sS -b /tmp/store_here.txt --json '{"prefix": "zhe"}' http://localhost:8080/api/users)
echo $response
