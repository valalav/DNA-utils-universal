# FTDNA Haplo Service API (Legacy)
*Service Port: 9003*

This service handles haplogroup phylogeny, tree traversal, and autocomplete suggestions. It is a legacy service proxied by the main application.

## 🌐 Base URIs
*   **Direct:** `http://localhost:9003`
*   **Proxy (Next.js):** `http://localhost:3000/api/haplo/*` (Recommended)

---

## 🌳 Tree & Search Endpoints

### 1. Search Haplogroup
#### `GET /api/search/:haplogroup`
Finds information about a haplogroup or SNP in FTDNA and YFull databases.

**Parameters**:
- `haplogroup` (path): specific haplogroup name (e.g., `R-M269`) or SNP.

**Response (200 OK):**
```json
{
  "name": "R-M269",
  "ftdnaDetails": {
    "url": "https://discover.familytreedna.com/y-dna/R-M269/tree",
    "path": { "string": "A0-T > ... > R-M269" }
  },
  "yfullDetails": { ... }
}
```

---

### 2. Check Subclade (Phylogeny)
#### `POST /api/check-subclade`
Checks if `haplogroup` is a descendant (subclade) of `parentHaplogroup`.

⚠️ **Rate Limit:** High cost. Limit to 100 req/min in production.

**Body:**
```json
{
  "haplogroup": "R-L23",
  "parentHaplogroup": "R-M269"
}
```

**Response:**
```json
{ "isSubclade": true }
```

---

### 3. Autocomplete
#### `GET /api/autocomplete`
Provides suggestions for UI search bars.

**Query Params:**
- `term`: Partial string (e.g., "R-M2")

**Response:**
```json
[
  { "type": "SNP", "value": "M269", "haplogroup": "R-M269" },
  { "type": "Haplogroup", "value": "R-M222", "haplogroup": "R-M222" }
]
```

---

## 🏥 Utility Endpoints

### Health Check
#### `GET /api/health`
**Response:** `{"status": "ok"}`
