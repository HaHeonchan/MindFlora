#!/bin/bash

echo "🔧 [1/2] sqlite3.o C로 컴파일 중..."
gcc -c -fPIC -DSQLITE_OMIT_JSON -o ./data/sqlite/sqlite3.o ./data/sqlite/sqlite3.c -I./data/sqlite

echo "🔧 [2/2] mymodule.so C++로 링크 중..."
g++ -shared -fPIC -o mymodule.so yoon.cpp \
  ./data/sqlite/sqlite3.o \
  -I./data/sqlite \
  -I/usr/include/x86_64-linux-gnu/curl \
  -I./data/json \
  -lcurl -ldl -pthread

echo "✅ 빌드 완료!"