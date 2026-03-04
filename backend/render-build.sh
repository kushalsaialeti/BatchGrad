#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Install Chrome for Puppeteer inside Render's native OS
npx puppeteer browsers install chrome
