import type { Repository } from '@/utils/constants';
export const DEFAULT_REPOS: Repository[] = [
  {
    id: 'aadna',
    name: 'AADNA.ru Database',
    description: 'Основная база данных Y-DNA',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTp8VNm5yS63RiflBpMY4b8d4RBTPecjU_RrC10EDcgSitcQxRtt1QbeN67g8bYOyqB088GLOTHIG5g/pub?gid=90746110&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'G',
    name: 'G Database',
    description: 'База данных для гаплогруппы G',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOBSOYSNmI7X0vbDNa8qXCloT18ONgs1r9kht_gO62RcMqHuirFZWh-aAl45EOBr_2X-r285ZG4bnf/pub?gid=886727200&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'r1a',
    name: 'R1a Database',
    description: 'База данных для гаплогруппы R1a',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRU8tnVM0DyHCYmpdQhKAdyjiwc1Q0GYDb1EOBEZu_YPvmEvfQZPSZAsZo2Cvkk3R6qMElcTVKNjNYZ/pub?gid=1094141657&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'J2',
    name: 'J2 Database',
    description: 'База данных для гаплогруппы J2',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQdOZKzZjPnAo2WsmK86PymoWNxGm2Dc1kEMGAbtw5kWHPDURgN9e5PRR3x9_ag-CdAntzcSJRddbOS/pub?gid=1964163364&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'J1',
    name: 'J1 Database',
    description: 'База данных для гаплогруппы J1',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSf-FRmBHW8hnCopHADt54LApuvyuhpeImR-5xZPRHY_Ca91H8t_uPPgtrN0cIOZHzamN0zjwxV60cX/pub?gid=1814447974&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'E',
    name: 'E Database',
    description: 'База данных для гаплогруппы E',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTvc9oN1jumSux4OBv8MUEzCJyabastzp06C7tuEwv_Ud_DW60ISrVI1D-gKjWs6JibefG8D_pQfIyI/pub?gid=1307961167&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'I',
    name: 'I Database',
    description: 'База данных для гаплогруппы I',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRasrJA3vR1vJineI98GIvmNBL6UXxdpLbJ-k0Qb_60ukvGn9ZDkopG3FDKm0GJg8M8i7r5vK__qsI-/pub?gid=1455355483&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'Others',
    name: 'Others Database',
    description: 'База данных для гаплогруппы Others',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSs84tXzDaQzQHjfG4TlR7ARTaE_iU12cgKzjxg7GaQPHRkbisVHRJ8ywx7ldkKV4hyI5pBwYVlYwLz/pub?gid=65836825&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'Genopoisk',
    name: 'Genopoisk',
    description: 'База данных Генопоиск',
    category: 'Y-DNA',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvpu_8LnaCLirvcL1U_HmQZ2dV-sGVtcQ05tI2fmO3Sym-BJ_LE5i9cirzS42vgmWKt21qicEUVRJ2/pub?gid=0&single=true&output=csv',
    type: 'google_sheet' as const
  },
  {
    id: 'r1b',
    name: 'R1b Database',
    description: 'База данных для гаплогруппы R1b',
    category: 'Y-DNA',
    type: 'chunked_json' as const,
    url: '/chunk_',
    chunks: 16
  }
 ];