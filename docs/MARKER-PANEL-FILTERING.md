# 🛡️ Logic: Marker Panel Filtering (80% Rule)
*Core Algorithm for Match Quality Assurance*

## 🎯 The Purpose
To prevent "false positives" where a profile with very few markers (e.g., 12) artificially scores a 100% match against a high-resolution query (e.g., 111 markers), the system enforcing a **Minimum Marker Threshold**.

## 📏 The 80% Rule
For a profile to be considered a valid match, it must possess **at least 80%** of the markers required by the selected panel.

> **Formula:** `MinRequired = CEIL(SelectedPanelSize * 0.8)`

### Thresholds Table
| Panel | Markers | Min Required (80%) |
|:---|:---:|:---:|
| **Y-STR12** | 12 | **10** |
| **Y-STR37** | 37 | **30** |
| **Y-STR67** | 67 | **54** |
| **Y-STR111** | 111 | **89** |

---

## 💻 Implementation: Client-Side (Standard Search)
The primary search runs effectively in the browser (frontend).

**File:** `str-matcher/src/utils/calculations.ts`
**Function:** `calculateGeneticDistance`

```typescript
// 1. Determine active markers for the selected panel (e.g., Y-STR37)
const markersToCompare = markerGroups[selectedMarkerCount];

// 2. Count how many of these markers the QUERY actually has data for
const activeMarkers = markersToCompare.filter(marker => 
  marker in profile1 && profile1[marker]?.trim()
);

// 3. Calculate the dynamic threshold
const minRequired = Math.ceil(activeMarkers.length * 0.8);

// 4. Compare with the MATCH profile
// ... counting compared markers ...

// 5. Hard stop if threshold not met
if (comparedCount < minRequired) {
  return {
    distance: 0,
    comparedMarkers: comparedCount,
    percentIdentical: 0,
    hasAllRequiredMarkers: false // Excludes from results
  };
}
```

---

## ☁️ Implementation: Server-Side (Backend Search)
The accelerated backend search (PostgreSQL) implements the same logic for consistency.

**File:** `backend/services/matchingService.js`
**Function:** `findMatches` (calls SQL function `find_matches_batch`)

The logic is enforced inside the high-performance PL/pgSQL function:
1.  **Input:** Accepts `markerCount` (12/37/67/111) from the request.
2.  **Filtering:** The SQL `WHERE` clause filters out rows where `array_length(markers) < threshold`.
3.  **Result:** Only "dense" profiles are returned to the API.

---

## 🔍 Validation Example
**Scenario:**
*   **Query:** Full 37 marker kit.
*   **Database:** Contains "Partial Kit A" (10 markers).
*   **Action:** User searches with "Panel: 37".

**Outcome:**
1.  **Threshold:** 37 * 0.8 = **30 markers**.
2.  **Check:** Kit A has 10 markers.
3.  **Result:** 10 < 30. Kit A is **EXCLUDED** from results.
    *   *Effect:* Prevents Kit A from showing up as a "Top Match" with 0 GD but low confidence.

**Correction:**
*   To see "Partial Kit A", the user must switch the search panel to **Y-STR12**.
*   **Threshold:** 12 * 0.8 = **10 markers**.
*   **Result:** 10 >= 10. Kit A is **INCLUDED**.

## ✅ Status
*   **Client-Side:** Verified in `calculations.ts`.
*   **Server-Side:** Verified usage in `matchingService.js`.
