export interface STRProfile {
  kitNumber: string;
  name?: string;
  country?: string;
  haplogroup?: string;
  markers: Record<string, string>;
}

export type MarkerCount = 12 | 37 | 67 | 111;

export interface STRMatch {
  profile: STRProfile;
  distance: number;
  comparedMarkers: number;
  identicalMarkers: number;
  percentIdentical: number;
  hasAllRequiredMarkers: boolean;
}

export interface HistoryItem extends STRProfile {
  timestamp: Date;
}

export interface Match {
    id: string;
    name: string;
    haplogroup?: string;
    markers: Record<string, string>;
    distance?: number;
    comparedMarkers?: number;
    identicalMarkers?: number;
    percentIdentical?: number;
}

export interface Filters {
    haplogroups: string[];
    maxDistance?: number;
    minMarkers?: number;
    includeSubclades?: boolean;
}

export interface HaplogroupDetails {
    id: string;
    name: string;
    path: {
        string: string;
        nodes: Array<{
            id: string;
            name: string;
            baseHaplo: string;
        }>;
    };
    variants?: Array<{
        variant: string;
        alternativeNames?: string[];
    }>;
    statistics?: {
        kitsCount: number;
        subBranches: string[];
    };
}

export interface SearchResponse {
    name: string;
    haplogroup: string;
    ftdnaDetails: HaplogroupDetails | null;
    yfullDetails: HaplogroupDetails | null;
} 