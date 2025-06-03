#!/bin/bash

echo "🔧 mymodule.so 생성 중..."

g++ -shared -fPIC -o mymodule.so yoon.cpp \
  ./data/sqlite/sqlite3.c \
  -I./data/sqlite \
  -I/usr/include/x86_64-linux-gnu/curl \
  -I./data/json \
  -lcurl -ldl -pthread

echo "✅ 빌드 완료!"
