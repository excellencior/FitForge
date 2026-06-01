#!/bin/bash
set -e

# ─── FitForge APK Build Script ───
# Builds the web app, syncs to Capacitor, compiles Android APK,
# and copies the result to fitforge/release/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELEASE_DIR="$SCRIPT_DIR/release"
APK_OUTPUT="$SCRIPT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🏋️  FitForge — APK Build Pipeline${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ─── Step 0: Activate JDK 21 ───
echo -e "\n${YELLOW}[0/4]${NC} Activating JDK 21..."
export JAVA_HOME=/usr/local/jdk21
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=~/Applications/AndroidSDK
export ANDROID_SDK_ROOT=$ANDROID_HOME
java -version 2>&1 | head -1
echo -e "${GREEN}  ✓ JDK 21 active${NC}"

# ─── Step 1: Build web assets ───
echo -e "\n${YELLOW}[1/4]${NC} Building web assets with Vite..."
cd "$SCRIPT_DIR"
npx vite build
echo -e "${GREEN}  ✓ Web build complete${NC}"

# ─── Step 2: Sync to Capacitor Android ───
echo -e "\n${YELLOW}[2/4]${NC} Syncing to Android..."
npx cap sync android
echo -e "${GREEN}  ✓ Capacitor sync complete${NC}"

# ─── Step 3: Build debug APK ───
echo -e "\n${YELLOW}[3/4]${NC} Building Android APK (this may take a few minutes)..."
cd "$SCRIPT_DIR/android"
./gradlew assembleDebug
echo -e "${GREEN}  ✓ APK build complete${NC}"

# ─── Step 4: Copy APK to release ───
echo -e "\n${YELLOW}[4/4]${NC} Copying APK to release/..."
cd "$SCRIPT_DIR"
mkdir -p "$RELEASE_DIR"
cp "$APK_OUTPUT" "$RELEASE_DIR/FitForge.apk"

APK_SIZE=$(du -h "$RELEASE_DIR/FitForge.apk" | cut -f1)

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ BUILD SUCCESSFUL${NC}"
echo -e "${GREEN}  📦 APK: release/FitForge.apk (${APK_SIZE})${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
