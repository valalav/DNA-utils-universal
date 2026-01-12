# Design: JSON Match Export with Rarity Logic

## 🎯 Goal
Export a JSON dataset for a specific profile (Query) containing its matches, calculated Genetic Distances (GD), and **Rarity Codes**. This data will be used by external systems (e.g., WordPress) to render a visual matches table.

## 📌 Rarity Logic (The "Order of Operations")
The user requires a specific sequence to ensure accurate rarity scoring:
1.  **Fetch Full Match List**: Get all matches for the query (e.g., Y37 panel, GD <= 25).
2.  **Calculate Rarity (Global Context)**: Calculate how "rare" the Query's marker values are relative to *this entire set*.
    *   *Why?* Rarity is context-dependent. A value might be rare in the top 30 but common in the full 1000 matches.
3.  **Truncate**: Keep only the **Top 30** matches (sorted by GD).
4.  **Export**: Generate the JSON.

### Rarity Tiers & Codes
Based on `AdvancedMatchesTable.tsx` (lines 92-119):

| Frequency (f) | Level | Color Code (JSON) | UI Color |
|:---|:---|:---|:---|
| `f <= 0.04` | Extremely Rare | `4` | 🟥 Red |
| `f <= 0.08` | Very Rare | `3` | 🟧 Orange (Dark) |
| `f <= 0.15` | Rare | `2` | 🟧 Orange (Light) |
| `f <= 0.25` | Uncommon | `1` | 🟨 Yellow |
| `f > 0.25` | Common | `0` | ⬜ White |

**Formula**:
`Frequency = (Count of Matches with Value == Query Value) / (Total Matches Count)`

---

## 💾 JSON Data Structure

```json
{
  "meta": {
    "query_kit": "123456",
    "query_name": "John Doe",
    "query_haplogroup": "R-M269",
    "panel": "Y37",
    "generated_at": "2024-01-20T10:00:00Z",
    "total_matches_found": 150,
    "matches_included": 30
  },
  "markers": ["DYS393", "DYS390", "DYS19", ...], // Ordered Y37 List
  "query_values": {
    "DYS393": "13",
    "DYS390": "24",
    ...
  },
  "rarity_scores": {
    // Rarity of the QUERY's value in the full dataset
    "DYS393": 0, // Common
    "DYS390": 4, // Extremely Rare (e.g. value 24 is rare)
    ...
  },
  "matches": [
    {
      "kit": "654321",
      "name": "Smith",
      "country": "Scotland",
      "haplo": "R-L21",
      "gd": 2,
      "shared": 37,
      "values": {
        // Only values that differ? Or all? 
        // Recommendation: ALL values for easy rendering
        "DYS393": "13",
        "DYS390": "23", // Differs from Query (24)
        ...
      },
      "diffs": {
        // Calculated differences relative to Query
        "DYS390": -1
      }
    },
    ...
  ]
}
```

## 🛠️ Implementation Plan

### Option A: Backend Endpoint (Recommended)
Create a new endpoint `GET /api/export/matches/:kitNumber`.
*   **Pros**: Automatable, can be called by WP directly.
*   **Cons**: Needs to re-implement `palindromes` and `GD` logic in Node.js (currently in `services/matchingService.js`).

### Option B: Frontend "Export JSON" Button
Add a button in `AdvancedMatchesTable`.
*   **Pros**: Rarity is already calculated! No code duplication.
*   **Cons**: User must manually click and save.
*   **Correction**: The user implies "Pass table... save to json". This sounds like a server-side task or a "one-off" generation. Given the complexity of porting rarity logic perfectly, **Option A** is better for long-term, but **Option B** is faster to prove the data layout.

**Decision**: I will propose **Option A (Backend)** as the robust solution, but if you want immediate results without risk of logic drift, we can start with Option B.
*   **Wait**, the User said: "Task is to pass table... save to json". If the "table" is passed, maybe it's a function?
*   Let's assume **Backend Endpoint** for now as it fits "WP Integration".
