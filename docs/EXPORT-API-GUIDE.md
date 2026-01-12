# 📤 Export API Guide

## Overview
The Export API allows authorized systems (e.g., WordPress, External Tools) to retrieve genetic match data in a portable JSON format.

## Endpoint

### `GET /api/profiles/export/matches/:kitNumber`

Retrieves the **Top 30** genetic matches for a specific kit, enriched with **Rarity Scores**.

### Security
*   **Auth Required**: Yes (`x-api-key` header)
*   **Rate Limit**: Applied (standard API limits)

### Parameters
| Name | Type | Default | Description |
|:---|:---|:---|:---|
| `kitNumber` | string | **Required** | The Kit Number (e.g., `KAB-110`) |
| `maxDistance` | number | `25` | Maximum Genetic Distance to include in search context |
| `markerCount` | number | `37` | Panel size (`12`, `25`, `37`, `67`, `111`) |

### Response Format
```json
{
  "meta": {
    "query_kit": "KAB-110",
    "matches_included": 30,
    "total_matches_found": 5000,
    "panel": "Y37"
  },
  "rarity_scores": {
    "DYS393": 0, // Common (>25%)
    "DYS390": 4  // Extremely Rare (<=4%)
  },
  "matches": [
    {
      "kit": "12345",
      "gd": 2,
      "diffs": {
        "DYS390": -1
      }
    }
  ]
}
```

### Rarity Codes
| Code | Level | Frequency |
|:---|:---|:---|
| `4` | Extremely Rare | ≤ 4% |
| `3` | Very Rare | ≤ 8% |
| `2` | Rare | ≤ 15% |
| `1` | Uncommon | ≤ 25% |
| `0` | Common | > 25% |
