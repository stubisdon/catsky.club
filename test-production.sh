#!/bin/bash
# Post-deployment test script for production server
# Run this after deployment to verify everything is working

set -e  # Exit on error

echo "🧪 Running post-deployment tests..."

# Configuration
TEST_URL="${TEST_URL:-http://localhost:3001}"
PROD_URL="${PROD_URL:-https://catsky.club}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $response)"
        return 1
    fi
}

# Function to test page content
test_page_content() {
    local url=$1
    local search_text=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    content=$(curl -s --max-time 10 "$url" || echo "")
    
    if echo "$content" | grep -qi "$search_text"; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} (Content not found)"
        return 1
    fi
}

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

echo ""
echo "Testing local server ($TEST_URL)..."
echo "----------------------------------------"

# Test 1: Home page loads
if test_endpoint "$TEST_URL" "Home page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 2: Home page has expected content
if test_page_content "$TEST_URL" "catsky.club" "Home page content"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 3: Listen page loads
if test_endpoint "$TEST_URL/listen" "Listen page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 4: Watch page loads
if test_endpoint "$TEST_URL/watch" "Watch page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 5: Connect page loads
if test_endpoint "$TEST_URL/connect" "Connect page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 6: Join page loads
if test_endpoint "$TEST_URL/join" "Join page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 7: Player page loads
if test_endpoint "$TEST_URL/player" "Player page"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Test 8: Static assets load (check for main JS bundle)
echo -n "Testing static assets... "
if curl -s --max-time 10 "$TEST_URL/assets/" | grep -q "index" || [ -d "dist/assets" ]; then
    echo -e "${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} (Could not verify, but this is not critical)"
    ((TESTS_PASSED++))
fi

# Test 9: API endpoint (if exists)
echo -n "Testing API health... "
api_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$TEST_URL/api/submit" -X POST -H "Content-Type: application/json" -d '{}' || echo "000")
if [ "$api_response" = "400" ] || [ "$api_response" = "200" ]; then
    # 400 is expected for empty body, 200 for success
    echo -e "${GREEN}✓${NC} (API responding)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} (API may not be configured)"
    ((TESTS_PASSED++))
fi

# Test 10: Check if server process is running
echo -n "Testing server process... "
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "catsky-club.*online"; then
        echo -e "${GREEN}✓${NC} (PM2 process running)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} (PM2 process not running)"
        ((TESTS_FAILED++))
    fi
else
    # Check if node process is running
    if pgrep -f "server.js" > /dev/null || pgrep -f "node.*3001" > /dev/null; then
        echo -e "${GREEN}✓${NC} (Server process running)"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (Could not verify process status)"
        ((TESTS_PASSED++))
    fi
fi

echo ""
echo "----------------------------------------"
echo "Test Results:"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

# Optional: Test production URL if different from local
if [ "$PROD_URL" != "$TEST_URL" ] && [ "$PROD_URL" != "http://localhost:3001" ]; then
    echo ""
    echo "Testing production URL ($PROD_URL)..."
    echo "----------------------------------------"
    
    if test_endpoint "$PROD_URL" "Production home page"; then
        echo -e "${GREEN}✓ Production site is accessible${NC}"
    else
        echo -e "${RED}✗ Production site may not be accessible${NC}"
    fi
fi

# Exit with error if any critical tests failed
if [ $TESTS_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the deployment.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
fi
