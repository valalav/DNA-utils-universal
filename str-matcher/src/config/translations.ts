export const translations = {
  en: {
    common: {
      search: 'Search',
      save: 'Save',
      cancel: 'Cancel',
      create: 'Create',
      delete: 'Delete',
      loading: 'Loading...',
      export: 'Export', 
      refresh: 'Refresh',
      apply: 'Apply',
      reset: 'Reset',
      close: 'Close',
      remove: 'Remove',
      load: 'Load',
      markersTitle: 'STR Markers',
      showHistory: 'Show History',
      searchButton: 'Search',
      buttonText: {
        populateMarkers: 'Populate Markers',
        reset: 'Reset',
        findMatches: 'Find Matches',
        remove: 'Remove',
        searchButton: 'Find Matches',
        upload: 'Upload File',
        addSource: 'Add Source'
      },
      actions: {
        populateMarkers: 'Populate Markers',
        reset: 'Reset', 
        search: 'Search'
      }
    },
    header: {
      title: 'STR Matcher',
      language: 'Language',
      dropdownTitle: 'Select language',
      instructions: 'Instructions'
    },
    colorSchemes: {
      classic: 'Classic Blue',
      emerald: 'Emerald',
      ruby: 'Ruby',
      amethyst: 'Amethyst', 
      sunset: 'Sunset',
      slate: 'Slate',
      ocean: 'Ocean',
      forest: 'Forest',
      grape: 'Grape',
      custom: 'Custom',
      selectScheme: 'Select color scheme',
      createCustom: 'Create custom scheme'
    },
    loadedKits: {
      search: 'Search kits...',
      searchAriaLabel: 'Search through loaded kits',
      noSearchResults: 'No matching kits found',
      noKits: 'No kits loaded',
      totalCount: '{count} kits loaded'
    },
    searchHistory: {
      noHistory: 'No search history',
      title: 'Recent Searches',
      clearHistoryTooltip: 'Clear search history',
      clearHistory: 'Clear History',
      clickToLoad: 'Click to load this kit',
      lastSearched: 'Last searched',
      recentSearches: 'Recent searches'
    },
    table: {
      kit: 'Kit',
      name: 'Name',
      country: 'Country',
      haplo: 'Haplo',
      gd: 'GD',
      str: 'STR',
      percent: '%',
      filter: 'Filter {column}',
      removeMarker: 'Remove marker {marker}',
      noData: 'No data available',
      filterKit: 'Filter Kit',
      filterName: 'Filter Name',
      filterCountry: 'Filter Country',
      filterHaplo: 'Filter Haplogroup',
      actions: 'Actions',
      columnsToShow: 'Columns to show'
    },
    input: {
      pasteDatabase: 'Paste database here',
      enterKitNumber: 'Enter Kit Number',
      databaseInput: 'Database Input ({count} records)',
      searchKits: 'Search kits...',
      searchDatabases: 'Search databases...',
      kitNumberPlaceholder: 'e.g., IN12345',
      databasePlaceholder: 'Paste your database content here'
    },
    search: {
      settings: 'Search Settings',
      kitNumber: 'Kit Number',
      markerCount: 'Marker Count',
      maxDistance: 'Max Distance',
      maxMatches: 'Max Matches',
      sortOrder: 'Sort Order',
      sortOptions: {
        default: 'Default FTDNA Order',
        mutation_rate: 'By Mutation Rate'
      },
      button: 'Find Matches',
      searching: 'Searching...',
      advancedSettings: 'Advanced Settings',
      resetSettings: 'Reset Settings',
      enterKitNumber: 'Enter Kit Number',
      searchInProgress: 'Search in progress...',
      history: 'Search History',
      noHistory: 'No search history',
      calculationMode: 'Режим расчета ГД',
      calculationModes: {
        standard: 'Стандартный (макс. 2)',
        extended: 'Расширенный (без ограничений)'
      }
    },
    markers: {
      title: 'STR Markers',
      settings: 'Marker Settings',
      removeMarker: 'Remove marker',
      markersForComparison: 'Markers for comparison',
      markerOrder: 'Marker order',
      maxGenericDistance: 'Max Genetic Distance',
      maxMatches: 'Max Matches',
      column: {
        dys: 'DYS'
      },
      noMarkers: 'No markers selected',
      selectMarkers: 'Select markers',
      selectedMarkers: '{count} markers selected',
      markerInput: 'Input value for marker {marker}',
      counts: {
        '12': '12 markers',
        '37': '37 markers', 
        '67': '67 markers',
        '111': '111 markers'
      }
    },
    matches: {
      found: '{count} matches found',
      exportCSV: 'Export CSV',
      exportJPG: 'Export JPG'
    },
    database: {
      loaded: 'Loaded ({count})',
      loadedProfiles: 'Loaded profiles',
      sources: 'Data Sources',
      stats: 'Database Statistics',
      totalProfiles: 'Total Profiles',
      totalMatches: 'Total Matches',
      uploadFile: 'Upload File',
      addSource: 'Add Source',
      searchSources: 'Search sources...',
      processing: 'Processing profiles...',
      saveToLocal: 'Save to Local Database',
      loadMore: 'Load more',
      noMoreData: 'No more data to load',
      processingFile: 'Processing file...',
      loadComplete: 'Load complete',
      manualInput: 'Manual Input',
      loadSelected: 'Load Selected ({count})',
      clear: "Clear Database"
    },
    errors: {
      enterKitNumber: 'Please enter Kit Number',
      kitNumberAndDatabaseRequired: 'Kit number and database required',
      kitNumberNotFound: 'Kit Number not found in database',
      failedToLoadProfiles: 'Failed to load saved profiles',
      unknownError: 'Unknown error occurred',
      invalidFileFormat: 'Invalid file format',
      processingError: 'Error processing file',
      networkError: 'Network error occurred',
      emptyDatabase: 'Database is empty',
      noValidData: 'No valid data found',
      parsingError: 'Error parsing database',
      invalidKitNumber: 'Invalid Kit Number format',
      databaseError: 'Database error',
      connectionError: 'Connection error'
    },
    settings: {
      title: 'Settings'
    },
    haplogroups: {
      includeSubclades: 'Include subclades',
      showEmpty: 'Show empty haplogroups',
      showNonNegative: 'Show non-negative',
      applyFilter: 'Apply filter',
      filter: 'Haplogroup filter',
      enterHaplogroup: 'Enter haplogroup',
      noHaplogroup: 'No haplogroup',
      keepFilteredOnly: 'Keep filtered only',
      removeFiltered: 'Remove filtered'
    }
  },
  ru: {
    common: {
      search: 'Поиск',
      save: 'Сохранить',
      cancel: 'Отмена',
      create: 'Создать', 
      delete: 'Удалить',
      loading: 'Загрузка...',
      export: 'Экспорт',
      refresh: 'Обновить',
      apply: 'Применить',
      reset: 'Сбросить',
      close: 'Закрыть',
      remove: 'Удалить',
      load: 'Загрузить',
      markersTitle: 'STR Маркеры',
      showHistory: 'Показать историю',
      searchButton: 'Поиск',
      buttonText: {
        populateMarkers: 'Заполнить маркеры',
        reset: 'Сбросить',
        findMatches: 'Найти совпадения',
        remove: 'Удалить',
        searchButton: 'Найти совпадения', 
        upload: 'Загрузить файл',
        addSource: 'Добавить источник'
      },
      actions: {
        populateMarkers: 'Заполнить маркеры',
        reset: 'Сбросить',
        search: 'Поиск'
      }
    },
    header: {
      title: 'STR Matcher',
      language: 'Язык',
      dropdownTitle: 'Выбор языка',
      instructions: 'Инструкция'
    },
    colorSchemes: {
      classic: 'Классический синий',
      emerald: 'Изумрудный',
      ruby: 'Рубиновый',
      amethyst: 'Аметистовый',
      sunset: 'Закат',
      slate: 'Графитовый', 
      ocean: 'Океан',
      forest: 'Лесной',
      grape: 'Виноградный',
      custom: 'Пользовательская',
      selectScheme: 'Выберите цветовую схему',
      createCustom: 'Создать свою схему'
    },
    loadedKits: {
      search: 'Поиск наборов...',
      searchAriaLabel: 'Поиск по загруженным наборам',
      noSearchResults: 'Наборы не найдены',
      noKits: 'Нет загруженных наборов',
      totalCount: 'Загружено наборов: {count}'
    },
    searchHistory: {
      noHistory: 'История поиска пуста',
      title: 'История поиска',
      clearHistoryTooltip: 'Очистить историю',
      clearHistory: 'Очистить историю',
      clickToLoad: 'Нажмите чтобы загрузить набор',
      lastSearched: 'Последний поиск',
      recentSearches: 'Недавние поиски'
    },
    table: {
      kit: 'Набор',
      name: 'Имя',
      country: 'Страна',
      haplo: 'Гапло',
      gd: 'ГР',
      str: 'STR',
      percent: '%',
      filter: 'Фильтр {column}',
      removeMarker: 'Удалить маркер {marker}',
      noData: 'Нет данных',
      filterKit: 'Фильтр набора',
      filterName: 'Фильтр имени',
      filterCountry: 'Фильтр страны',
      filterHaplo: 'Фильтр гаплогруппы',
      actions: 'Действия',
      columnsToShow: 'Отображаемые колонки'
    },
    input: {
      pasteDatabase: 'Вставьте базу данных сюда',
      enterKitNumber: 'Введите номер набора',
      databaseInput: 'База данных ({count} записей)',
      searchKits: 'Поиск наборов...',
      searchDatabases: 'Поиск в базах...',
      kitNumberPlaceholder: 'например, IN12345',
      databasePlaceholder: 'Вставьте содержимое базы данных сюда'
    },
    search: {
      settings: 'Настройки поиска',
      kitNumber: 'Номер набора',
      markerCount: 'Количество маркеров',
      maxDistance: 'Макс. дистанция',
      maxMatches: 'Макс. совпадений',
      sortOrder: 'Порядок сортировки',
      sortOptions: {
        default: 'Стандартный порядок FTDNA',
        mutation_rate: 'По скорости мутации'
      },
      button: 'Найти совпадения',
      searching: 'Поиск...',
      advancedSettings: 'Расширенные настройки',
      resetSettings: 'Сбросить настройки', 
      enterKitNumber: 'Введите номер набора',
      searchInProgress: 'Идет поиск...',
      history: 'История поиска',
      noHistory: 'История поиска пуста',
      calculationMode: 'Режим расчета ГД',
      calculationModes: {
        standard: 'Стандартный (макс. 2)',
        extended: 'Расширенный (без ограничений)'
      }
    },
    markers: {
      title: 'STR Маркеры',
      settings: 'Настройки маркеров',
      removeMarker: 'Удалить маркер',
      markersForComparison: 'Маркеры для сравнения',
      markerOrder: 'Порядок маркеров',
      maxGenericDistance: 'Максимальная генетическая дистанция',
      maxMatches: 'Максимальное количество совпадений',
      column: {
        dys: 'DYS'
      },
      noMarkers: 'Маркеры не выбраны',
      selectMarkers: 'Выберите маркеры',
      selectedMarkers: 'Выбрано маркеров: {count}',
      markerInput: 'Введите значение для маркера {marker}',
      counts: {
        '12': '12 маркеров',
        '37': '37 маркеров',
        '67': '67 маркеров', 
        '111': '111 маркеров'
      }
    },
    matches: {
      found: 'Найдено {count} совпадений',
      exportCSV: 'Экспорт CSV',
      exportJPG: 'Экспорт JPG'
    },
    database: {
      loaded: 'Загружено ({count})',
      loadedProfiles: 'Загружено профилей',
      sources: 'Источники данных',
      stats: 'Статистика базы',
      totalProfiles: 'Всего профилей',
      totalMatches: 'Всего совпадений',
      uploadFile: 'Загрузить файл',
      addSource: 'Добавить источник',
      searchSources: 'Поиск источников...',
      processing: 'Обработка профилей...',
      saveToLocal: 'Сохранить в локальную базу',
      loadMore: 'Загрузить еще',
      noMoreData: 'Больше данных нет',
      processingFile: 'Обработка файла...',
      loadComplete: 'Загрузка завершена',
      manualInput: 'Ручной ввод',
      loadSelected: 'Загрузить выбранное ({count})',
      clear: "Очистить базу"
    },
    errors: {
      enterKitNumber: 'Введите номер набора',
      kitNumberAndDatabaseRequired: 'Требуется указать номер набора и базу данных',
      kitNumberNotFound: 'Номер набора не найден в базе',
      failedToLoadProfiles: 'Не удалось загрузить сохраненные профили',
      unknownError: 'Произошла неизвестная ошибка',
      invalidFileFormat: 'Неверный формат файла',
      processingError: 'Ошибка обработки файла',
      networkError: 'Ошибка сети',
      emptyDatabase: 'База данных пуста',
      noValidData: 'Не найдено корректных данных',
      parsingError: 'Ошибка при разборе базы данных',
      invalidKitNumber: 'Неверный формат номера набора',
      databaseError: 'Ошибка базы данных',
      connectionError: 'Ошибка подключения'
    },
    settings: {
      title: 'Настройки'
    },
    haplogroups: {
      includeSubclades: 'Включать подклады',
      showEmpty: 'Показывать пустые гаплогруппы',
      showNonNegative: 'Показывать неотрицательные',
      applyFilter: 'Применить фильтр',
      filter: 'Фильтр гаплогрупп',
      enterHaplogroup: 'Введите гаплогруппу',
      noHaplogroup: 'Нет гаплогруппы',
      keepFilteredOnly: 'Оставить только отфильтрованные',
      removeFiltered: 'Удалить отфильтрованные'
    }
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;