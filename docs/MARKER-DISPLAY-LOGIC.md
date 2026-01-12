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
66: | ≤ 8% | **Very Rare** | 🟧 Orange (Dark) |
67: | ≤ 4% | **Extremely Rare**| 🟥 Red |
68:
69: ---
70:
71: ## 🏷️ FTDNA Panel Calculation (Badges)
72: The system displays badges (`[Y37]`, `[Y67]`, `[Y111]`) next to Kit Numbers based on the *effective* marker count, closely mirroring FTDNA's nomenclature.
73: 
74: **Logic (`getPanelBadge`):**
75: 1.  Iterate through all non-empty markers in the profile.
76: 2.  **Base Count**: Each marker counts as +1.
77: 3.  **Palindrome Weighting**: Multi-copy markers add extra weight to match FTDNA counting rules:
78:     *   `DYS464`: Counts as **4** (Base + 3 extra).
79:     *   `DYS385`, `YCAII`, `CDY`, `DYF395S1`, `DYS413`, `DYF387S1`, `DYF404S1`: Count as **2** (Base + 1 extra).
80:     *   `DYS459`, `DYS459`: Count as **2**.
81: 
82: **Thresholds:**
83: *   **Y111**: Count ≥ 100
84: *   **Y67**: Count ≥ 60
85: *   **Y37**: Count ≥ 30
86: *   **Y12**: Count ≥ 10


*Source: `MatchesTable.tsx` (useMemo `markerRarityCache`)*

---

## 🛠️ Components
*   **`MatchesTable.tsx`:** Main component. Handles filtering, rendering lines, and calling calculation utils.
*   **`calculation.ts`:** Core math. `calculateMarkerDifference`, `calculateGeneticDistance`.
*   **`markerOperations.ts`:** State interactions (hiding/resetting markers).

## 🚀 Future / Alternative Logic
*   **Note:** An experimental component `AdvancedMatchesTable.tsx` implements a "Difference Only" view (hiding columns with 0 diffs), but it is currently **disabled** in favor of the standard full-haplotype view.
