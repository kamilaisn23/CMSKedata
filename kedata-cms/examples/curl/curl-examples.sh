#!/bin/bash
# ========================================================
# Kedata CMS - cURL Integration Examples
# Tests every public REST API endpoint
# ========================================================

CMS_URL="http://localhost:3000/api/v1"
API_KEY="kd_live_tech_demo" # Ganti dengan API Key situs Anda

echo "=== 1. GET /pages (List Published Pages) ==="
curl -s -X GET "${CMS_URL}/pages?perPage=5" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json" | head -n 30
echo -e "\n"

echo "=== 2. GET /pages/:slug (Single Page by Slug) ==="
curl -s -X GET "${CMS_URL}/pages/about" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json" | head -n 30
echo -e "\n"

echo "=== 3. GET /posts (List Posts with filter & fields) ==="
curl -s -X GET "${CMS_URL}/posts?fields=title,slug,publishedAt&include=category,tags&perPage=3" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json" | head -n 30
echo -e "\n"

echo "=== 4. GET /posts/:slug (Single Post with dual HTML/JSON) ==="
curl -s -X GET "${CMS_URL}/posts/building-headless-cms" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json" | head -n 30
echo -e "\n"

echo "=== 5. GET /categories (Taxonomy Categories) ==="
curl -s -X GET "${CMS_URL}/categories" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json"
echo -e "\n"

echo "=== 6. GET /tags (Taxonomy Tags) ==="
curl -s -X GET "${CMS_URL}/tags" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json"
echo -e "\n"

echo "=== 7. GET /menus (Navigation Menus) ==="
curl -s -X GET "${CMS_URL}/menus?location=HEADER" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json"
echo -e "\n"

echo "=== 8. GET /settings (Branding & Contact Info) ==="
curl -s -X GET "${CMS_URL}/settings" \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json"
echo -e "\n"

echo "=== 9. GET /rss.xml (RSS 2.0 Feed) ==="
curl -s -I "${CMS_URL}/rss.xml?site=kedata-tech"
echo -e "\n"

echo "=== 10. GET /sitemap.xml (XML Sitemap) ==="
curl -s -I "${CMS_URL}/sitemap.xml?site=kedata-tech"
echo -e "\n"
