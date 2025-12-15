#!/bin/bash

echo "🚀 Clearing the default port..."

lsof -ti:5000 | xargs kill -9

echo "---Done---"