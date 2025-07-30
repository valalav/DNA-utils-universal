import type { STRProfile } from '@/utils/constants';

export const markerOperations = {
  updateMarkerValue: (query: STRProfile | null, marker: string, value: string): STRProfile | null => {
    if (!query) return null;
    return {
      ...query,
      markers: {
        ...query.markers,
        [marker]: value
      }
    };
  },

  hideMarker: (
    query: STRProfile | null,
    marker: string,
    database: STRProfile[]
  ): { updatedQuery: STRProfile | null; updatedDatabase: STRProfile[] } => {
    if (!query) return { updatedQuery: null, updatedDatabase: database };

    // Создаем новый объект маркеров без скрытого маркера
    const newMarkers = { ...query.markers };
    delete newMarkers[marker];

    const updatedQuery = {
      ...query,
      markers: newMarkers
    };

    // Теперь database не изменяем, оставляем как есть
    return { updatedQuery, updatedDatabase: database };
  },

  removeMarker: (query: STRProfile | null, marker: string, database: STRProfile[]): { updatedQuery: STRProfile | null; updatedDatabase: STRProfile[] } => {
    if (!query) return { updatedQuery: null, updatedDatabase: database };
    
    const newMarkers = { ...query.markers };
    delete newMarkers[marker];
    
    const updatedQuery = {
      ...query,
      markers: newMarkers
    };

    const updatedDatabase = database.map(profile => {
      const newProfileMarkers = { ...profile.markers };
      delete newProfileMarkers[marker];
      return {
        ...profile,
        markers: newProfileMarkers
      };
    });

    return { updatedQuery, updatedDatabase };
  },

  resetMarkers: () => {
    const inputs = document.querySelectorAll('input[data-marker]') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => {
      input.value = '';
    });
  },

  populateMarkerInputs: (profile: STRProfile) => {
    const grid = document.querySelector('div[class*="overflow-x-auto"]');
    if (grid) {
      // Заполняем все маркеры из профиля, включая ранее скрытые
      Object.entries(profile.markers).forEach(([marker, value]) => {
        const input = grid.querySelector(`input[id="${marker}"]`) as HTMLInputElement;
        if (input) {
          input.value = value;
        }
      });
    }
  }
}; 