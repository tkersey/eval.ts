#!/bin/bash

# Build the TypeScript project
echo "Building project..."
npm install
npm run build

# Run the example
echo "Running G-Eval example..."
OPENAI_API_KEY=$OPENAI_API_KEY node dist/examples/basic-usage.js