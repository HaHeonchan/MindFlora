#!/bin/bash
echo "🛠️ Render 서버에서 mymodule.so 빌드 중..."

g++ -shared -fPIC -o mymodule.so yoon.cpp \
  ./data/sqlite/sqlite3.o \
  -I./data/sqlite \
  -I/usr/include/x86_64-linux-gnu/curl \
  -I./data/json \
  -lcurl -ldl -pthread

echo "✅ 빌드 완료: mymodule.so 생성됨"
