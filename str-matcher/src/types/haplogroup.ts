export interface HaplogroupFilter {
  includeGroups: string[];
  excludeGroups: string[];
  includeSubclades: boolean;
}

export interface HaplogroupFilterProps {
  filterHaplogroup: string;
  setFilterHaplogroup: (value: string) => void;
  includeSubclades: boolean;
  setIncludeSubclades: (value: boolean) => void;
  showEmptyHaplogroups: boolean;
  setShowEmptyHaplogroups: (value: boolean) => void;
  showNonNegative: boolean;
  setShowNonNegative: (value: boolean) => void;
  onApplyFilter: () => void;
}

// Состояние фильтра гаплогрупп
export interface HaplogroupFilterState {
  includeGroups: string[];
  excludeGroups: string[];
  includeSubclades: boolean;
} 