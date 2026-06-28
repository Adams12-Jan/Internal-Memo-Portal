#!/bin/bash
# Diagnostic script to test the 405 error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Internal Memo Portal - 405 Error Diagnostic ===${NC}\n"

# Get backend and frontend URLs from user
read -p "Enter Render backend URL (e.g., https://internal-memo-api.onrender.com): " BACKEND_URL
read -p "Enter Vercel frontend URL (e.g., https://your-project.vercel.app): " FRONTEND_URL

BACKEND_URL="${BACKEND_URL%/}"  # Remove trailing slash
FRONTEND_URL="${FRONTEND_URL%/}"

echo -e "\n${YELLOW}Testing Backend...${NC}"

# Test 1: Health check
echo -e "\n1. Health Check:"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/status")
if [ "$HEALTH" -eq 200 ]; then
  echo -e "${GREEN}✓ Backend is running${NC}"
else
  echo -e "${RED}✗ Backend returned status $HEALTH${NC}"
  echo "  Problem: Backend not responding or offline"
fi

# Test 2: Login endpoint exists
echo -e "\n2. Login Endpoint:"
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}')

if [ "$LOGIN_STATUS" -eq 400 ] || [ "$LOGIN_STATUS" -eq 401 ]; then
  echo -e "${GREEN}✓ Endpoint exists (returned $LOGIN_STATUS - expected for bad credentials)${NC}"
elif [ "$LOGIN_STATUS" -eq 405 ]; then
  echo -e "${RED}✗ Method Not Allowed (405)${NC}"
  echo "  Problem: Backend doesn't accept POST to /api/auth/login"
elif [ "$LOGIN_STATUS" -eq 404 ]; then
  echo -e "${RED}✗ Route not found (404)${NC}"
  echo "  Problem: /api/auth/login route doesn't exist"
else
  echo -e "${YELLOW}? Unexpected status: $LOGIN_STATUS${NC}"
fi

# Test 3: CORS check
echo -e "\n3. CORS Headers:"
CORS_HEADER=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/auth/login" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin" || echo "MISSING")

if [[ "$CORS_HEADER" == "MISSING" ]]; then
  echo -e "${RED}✗ CORS header missing${NC}"
  echo "  Problem: CORS_ORIGIN not configured on backend"
  echo "  Solution: Set CORS_ORIGIN=$FRONTEND_URL on Render"
else
  echo -e "${GREEN}✓ CORS enabled: $CORS_HEADER${NC}"
fi

# Test 4: Check if frontend environment variable is set
echo -e "\n${YELLOW}Testing Frontend Configuration...${NC}"

echo -e "\n4. Checking VITE_API_URL:"
echo "  Go to Vercel Dashboard → Project → Settings → Environment Variables"
echo "  Verify VITE_API_URL is set to: $BACKEND_URL"
echo "  If not set, that's why you get 405 (requests go to static server)"

# Test 5: Full login simulation
echo -e "\n5. Simulating Login Request:"
echo "  Sending: POST $BACKEND_URL/api/auth/login"
echo "  With CORS header: Origin: $FRONTEND_URL"

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -d '{"email":"test@test.com","password":"wrongpassword"}' \
  -w "\nHTTP_STATUS:%{http_code}")

STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '$ d')

echo -e "\nResponse Status: $STATUS"
echo -e "Response Body: $BODY\n"

if [ "$STATUS" -eq 405 ]; then
  echo -e "${RED}✗ 405 Error Detected!${NC}"
  echo "  Possible causes:"
  echo "  1. Backend not deployed on Render"
  echo "  2. Frontend not sending POST (check authClient.ts)"
  echo "  3. Wrong endpoint path (check server.ts routes)"
elif [ "$STATUS" -eq 401 ]; then
  echo -e "${GREEN}✓ Endpoint working (rejected for bad credentials - expected)${NC}"
elif [ "$STATUS" -eq 500 ]; then
  echo -e "${YELLOW}? Server error (500)${NC}"
  echo "  Check Render logs for server errors"
fi

echo -e "\n${YELLOW}=== Summary ===${NC}"
echo -e "Backend: ${BACKEND_URL}"
echo -e "Frontend: ${FRONTEND_URL}"
echo -e "\nNext steps:"
echo "1. Verify VITE_API_URL is set in Vercel to: $BACKEND_URL"
echo "2. Verify CORS_ORIGIN is set in Render to: $FRONTEND_URL"
echo "3. Hard refresh browser (Ctrl+Shift+R)"
echo "4. Check DevTools Network tab for actual request URL"
