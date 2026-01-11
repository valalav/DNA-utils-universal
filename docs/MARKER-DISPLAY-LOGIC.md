# 🧬 Logic: Marker Display & Comparison
*Up-to-date for v2.0 Client-Side Architecture*

## 🎯 Overview
The STR Matcher displays marker comparisons in the `MatchesTable` component. Unlike previous server-side versions, all logic for visibility, difference calculation, and rarity highlighting happens in the browser.

---

## 👁️ Visibility Logic
Which markers are shown as columns in the results table?

### Rule: "Shared Presence"
A marker column is displayed if:
1.  **Query Profile** has a value for this marker.
2.  **AND** at least one **Match Profile** in the results list has a value for this marker.

*Source: `MatchesTable.tsx`*
```typescript
const visibleMarkers = orderedMarkers.filter(marker => {
  const queryValue = query?.markers[marker];
  if (!queryValue) return false;

  // Show if ANY match has this marker (even if value is same)
  return matches.some(match => !!match.profile.markers[marker]);
});
```

### User Control
Results are initially filtered by standard panel sizes (12, 37, 67, 111 markers).
*   **Hiding:** Users can manually remove a marker column by clicking the `×` header button. This triggers `markerOperations.removeMarker`, which updates the Query state to exclude that marker, forcing a table re-render and recalculation of Genetic Distance (GD).

---

## 🧮 Difference Calculation
Genetic Distance (GD) is calculated for each cell relative to the Query.

**Algorithm:**
*   **Standard:** `|Query - Match|`
*   **Palindromic (Multi-copy):** Uses specific logic (e.g., Min-distance or Sum-distance) defined in `calculations.ts` / `palindromes` constant.
*   **Stepwise Model:** Step-based mutations (Infinite Alleles Model is not used for display).

**Visual Indicators:**
*   **Match (Diff = 0):** displayed as standard text (or rarity colored).
*   **Difference (> 0):**
    *   **Value:** `+X` or `-X` (relative to Query).
    *   **Coloring:**
        *   **Diff 1:** <span style="color:orange">Orange</span> (1-step mutation)
        *   **Diff 2:** <span style="color:red">Red</span> (2-step)
        *   **Diff 3+:** <span style="color:darkred">Dark Red</span> (Multi-step)

---

## 🎨 Rarity Highlighting
Background colors indicate how rare a specific marker allele value is within the **current dataset** (visible matches).

**Calculation:**
*   **Scope:** Calculated dynamically based on the *currently filtered* list of matches.
*   **Formula:** `Frequency = (Count of Matches with Value X) / (Total Visible Matches)`

**Rarity Tiers:**
| Frequency | Tier | Background Color |
|:---|:---|:---|
| > 25% | **Common** | White / Transparent |
| ≤ 25% | **Uncommon** | 🟨 Yellow (Light) |
| ≤ 15% | **Rare** | 🟧 Orange (Light) |
| ≤ 8% | **Very Rare** | 🟧 Orange (Dark) |
| ≤ 4% | **Extremely Rare**| 🟥 Red |

*Source: `MatchesTable.tsx` (useMemo `markerRarityCache`)*

---

## 🛠️ Components
*   **`MatchesTable.tsx`:** Main component. Handles filtering, rendering lines, and calling calculation utils.
*   **`calculation.ts`:** Core math. `calculateMarkerDifference`, `calculateGeneticDistance`.
*   **`markerOperations.ts`:** State interactions (hiding/resetting markers).

## 🚀 Future / Alternative Logic
*   **Note:** An experimental component `AdvancedMatchesTable.tsx` implements a "Difference Only" view (hiding columns with 0 diffs), but it is currently **disabled** in favor of the standard full-haplotype view.
