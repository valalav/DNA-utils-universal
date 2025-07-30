export interface Profile {
  kitNumber: string;
  name?: string;
  haplogroup?: string;
  markers: Record<string, string>;
} 