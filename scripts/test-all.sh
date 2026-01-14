#!/bin/bash

# KOPA Agent - Complete Test Suite Runner

echo "🧪 KOPA Agent Test Suite"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Test 1: Quick Demo
echo -e "${BLUE}Test 1: Running Quick Demo${NC}"
echo "----------------------------"
npx ts-node examples/demo.ts
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Demo test passed${NC}"
else
    echo -e "${RED}❌ Demo test failed${NC}"
    exit 1
fi
echo ""

# Test 2: TypeScript Compilation
echo -e "${BLUE}Test 2: TypeScript Compilation${NC}"
echo "-------------------------------"
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript compilation passed${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi
echo ""

# Test 3: Unit Tests
echo -e "${BLUE}Test 3: Running Unit Tests${NC}"
echo "---------------------------"
npm test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
else
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi
echo ""

# Test 4: Build
echo -e "${BLUE}Test 4: Building Project${NC}"
echo "------------------------"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build passed${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  - Start API server: npm run dev"
echo "  - Run tests with coverage: npm run test:coverage"
echo "  - Test API endpoints: See TESTING_GUIDE.md"
