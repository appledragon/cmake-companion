# Test script for plain file path resolution (without variables)
# This script demonstrates that file paths without variables are also clickable and navigable

## Plain relative file paths
# Open main file: src/main.cpp
# Open utils: src/utils.cpp
# Open config: config.txt

## Plain relative paths with directory prefix
# Open header: include/utils.h
# Open another header: include/config.h

## Paths with ./ prefix
# Open with dot: ./src/example.cc
# Open readme: ./README.txt

## Paths with ../ prefix (relative to subdirectory)
# If this was in src/, this would work: ../include/utils.h

## Mixed variable and plain paths in the same line
# Variable path: ${SRC_DIR}/main.cpp and plain path: src/config.c

## Simple filenames (relative to current directory)
# Simple file: config.txt
# Another: README.txt

## Multiple paths on same line
# Files: src/main.cpp src/utils.cpp include/utils.h
