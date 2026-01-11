# Документация неудачной попытки добавления функции удаления и фильтрации маркеров

**Дата**: 2025-10-08
**Статус**: НЕУДАЧНО
**Компонент**: AdvancedMatchesTable.tsx

---

## Цель задачи

Добавить в заголовки колонок маркеров две интерактивные функции:
1. **Красный крестик (×)** - кнопка для удаления маркера из query и повторного поиска
2. **Чекбокс (☐)** - фильтр для показа только совпадений с определенным значением маркера

**Критическое требование**: Крестик должен быть расположен **ВЫШЕ** чекбокса.

---

## Что было реализовано успешно

### 1. Backend функциональность

**Файл**: `str-matcher/src/components/str-matcher/BackendSearch.tsx`

```typescript
const handleRemoveMarker = useCallback(async (markerToRemove: string) => {
  if (!profile) return;

  // Удаляем маркер из customMarkers и profile
  const updatedMarkers = { ...customMarkers };
  delete updatedMarkers[markerToRemove];
  setCustomMarkers(updatedMarkers);

  // Обновляем profile
  const updatedProfile = {
    ...profile,
    markers: updatedMarkers
  };
  setProfile(updatedProfile);

  // Перезапускаем поиск с обновлённым набором маркеров
  const searchMatches = await findMatches({
    markers: updatedMarkers,
    maxDistance,
    maxResults,
    markerCount,
    haplogroup: selectedHaplogroup
  });

  setMatches(searchMatches);
}, [profile, customMarkers, maxDistance, maxResults, markerCount, selectedHaplogroup, findMatches]);
```

**Статус**: ✅ Работает корректно

### 2. Функция фильтрации чекбоксом

**Файл**: `str-matcher/src/components/str-matcher/AdvancedMatchesTable.tsx`

```typescript
const [markerFilters, setMarkerFilters] = useState<Record<string, boolean>>({});

const toggleMarkerFilter = useCallback((marker: string) => {
  setMarkerFilters(prev => ({
    ...prev,
    [marker]: !prev[marker]
  }));
}, []);

// Фильтрация результатов
const filteredMatches = useMemo(() => {
  const activeFilters = Object.keys(markerFilters).filter(m => markerFilters[m]);
  if (activeFilters.length === 0) return matches;

  return matches.filter(match => {
    return activeFilters.every(marker => {
      const queryValue = query?.markers[marker];
      const matchValue = match.profile?.markers[marker];
      return queryValue === matchValue;
    });
  });
}, [matches, markerFilters, query]);
```

**Статус**: ✅ Работает корректно

### 3. Передача props

```typescript
<AdvancedMatchesTable
  matches={matches}
  query={profile}
  showOnlyDifferences={true}
  onKitNumberClick={handleKitNumberClick}
  onRemoveMarker={handleRemoveMarker}  // ✅ Передается
/>
```

**Статус**: ✅ Работает корректно

---

## Попытки решения проблемы позиционирования

### Хронология попыток (20+ итераций)

#### Попытка 1: Использование `sed` для замены значений
```bash
sed -i 's/top-2/TOP_TEMP/g; s/top-\[20px\]/top-2/g; s/TOP_TEMP/top-[20px]/g'
```
**Результат**: ❌ Не помогло

#### Попытка 2: Изменение порядка HTML элементов
Поменял местами button (крестик) и div (чекбокс) в JSX - сначала крестик, потом чекбокс.

**Результат**: ❌ Не помогло

#### Попытка 3: Удаление padding-top у `<th>`
Изменил `py-2` (padding: 8px vertical) на `pb-2` (padding-bottom: 8px)

**Код**:
```typescript
<th className="... pb-2 ...">  // было py-2
```

**Результат**: ❌ Не помогло

#### Попытка 4-7: Различные значения `top`
- `top-2` (8px)
- `top-0` (0px)
- `top-6` (24px)
- `top-[20px]` (arbitrary value 20px)

**Результат**: ❌ Не помогло

#### Попытка 8: Увеличение z-index
Изменил крестик с `z-20` на `z-30` для гарантированного отображения поверх.

**Результат**: ❌ Не помогло

#### Попытка 9: Добавление text-lg
Увеличил размер крестика: `text-lg`

**Результат**: ❌ Не помогло

#### Попытка 10-11: Inline styles вместо Tailwind классов
Заменил Tailwind классы на inline styles для максимального CSS priority:

```typescript
// Крестик
style={{ top: 0, zIndex: 30 }}

// Чекбокс
style={{ top: '24px', zIndex: 10 }}
```

**Результат**: ❌ Не помогло

#### Попытка 12-15: Перезапуски dev server
- Убивал node процессы через `taskkill`
- Перезапускал `npm run dev`
- Очищал `.next` cache: `rm -rf .next`
- Убивал multiple background bash shells

**Результат**: ❌ Не помогло

---

## Текущее состояние кода

**Файл**: `str-matcher/src/components/str-matcher/AdvancedMatchesTable.tsx`
**Строки**: 196-224

```typescript
<th key={marker} className="border-r border-blue-700 px-1 pb-2 text-center w-[35px] max-w-[35px] min-w-[35px] font-bold text-xs relative h-[120px]">
  {/* Кнопка удаления маркера - САМЫЙ ВЕРХ */}
  {onRemoveMarker && (
    <button
      onClick={() => onRemoveMarker(marker)}
      className="absolute left-1/2 -translate-x-1/2 text-red-600 hover:text-red-800 cursor-pointer font-bold leading-none text-lg"
      style={{ top: 0, zIndex: 30 }}
      title={`Удалить маркер ${marker}`}
    >
      ×
    </button>
  )}
  {/* Чекбокс для фильтрации - ПОД КРЕСТИКОМ */}
  <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '24px', zIndex: 10 }}>
    <input
      type="checkbox"
      checked={markerFilters[marker] || false}
      onChange={() => toggleMarkerFilter(marker)}
      className="cursor-pointer w-3 h-3"
      title={`Фильтровать: показать только совпадения по ${marker}`}
    />
  </div>
  {/* Название маркера */}
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'translateX(-50%) translateY(-50%) rotate(180deg)' }}>
    {marker}
  </div>
</th>
```

### Ожидаемый результат

```
┌─────────────┐
│   [×]       │  ← Крестик (top: 0)
│             │
│   [☐]       │  ← Чекбокс (top: 24px)
│             │
│     D       │
│     Y       │
│     S       │  ← Название маркера (top: 50%)
│     3       │
│     9       │
│     3       │
└─────────────┘
```

### Фактический результат (из скриншота)

```
┌─────────────┐
│   [☐]       │  ← Чекбокс (отображается СВЕРХУ!)
│             │
│     D       │
│     Y       │
│     S       │  ← Название маркера
│     3       │
│     9       │
│     3       │
│             │
│   [×]       │  ← Крестик (отображается СНИЗУ!)
└─────────────┘
```

---

## Анализ проблемы

### Возможные причины

1. **CSS конфликты**
   - Возможно существуют глобальные CSS правила которые переопределяют inline styles
   - Tailwind может иметь conflicting utilities

2. **Кэширование**
   - Браузер мог закэшировать старую версию CSS
   - Next.js build cache (`.next/`) мог содержать старый compiled code
   - Однако многократная очистка cache не помогла

3. **Multiple dev servers**
   - Обнаружено до 6 одновременно запущенных dev серверов
   - Пользователь мог подключаться к старому серверу
   - Попытки убить все процессы и запустить один чистый сервер не помогли

4. **Fundamental positioning issue**
   - Absolute positioning внутри `<th>` с `relative` может работать не так как ожидается
   - Transform (`-translate-x-1/2`) может влиять на stacking context
   - Writing mode (`vertical-rl`) названия маркера может влиять на layout

5. **React rendering order**
   - Порядок элементов в DOM может влиять на визуальное отображение несмотря на z-index
   - Conditional rendering (`{onRemoveMarker && ...}`) может создавать проблемы

### Наблюдения

- Tooltip `"Удалить маркер DYS390"` отображается корректно → значит новый код загружен
- Функция `onRemoveMarker` работает (prop передается)
- Inline styles должны иметь максимальный CSS priority, но не работают
- Проблема воспроизводится стабильно даже в режиме инкогнито

---

## Рекомендации для следующего разработчика

### 1. Диагностика через DevTools

```javascript
// В консоли браузера проверить computed styles:
const cross = document.querySelector('button[title^="Удалить маркер"]');
const checkbox = document.querySelector('input[type="checkbox"][title^="Фильтровать"]');

console.log('Cross computed top:', window.getComputedStyle(cross).top);
console.log('Checkbox computed top:', window.getComputedStyle(checkbox.parentElement).top);
console.log('Cross z-index:', window.getComputedStyle(cross).zIndex);
console.log('Checkbox z-index:', window.getComputedStyle(checkbox.parentElement).zIndex);
```

### 2. Альтернативный подход: Flexbox layout

Вместо absolute positioning использовать flexbox:

```typescript
<th className="... flex flex-col items-center relative">
  {/* Контейнер для контролов вверху */}
  <div className="flex flex-col items-center gap-1 mb-2">
    {onRemoveMarker && (
      <button onClick={() => onRemoveMarker(marker)}>×</button>
    )}
    <input type="checkbox" ... />
  </div>

  {/* Название маркера в центре с flex-grow */}
  <div className="flex-grow flex items-center">
    <span style={{ writingMode: 'vertical-rl' }}>{marker}</span>
  </div>
</th>
```

### 3. Проверка глобальных стилей

Проверить файлы:
- `str-matcher/src/app/globals.css`
- `str-matcher/tailwind.config.js`
- Любые CSS modules

На наличие правил которые могут переопределять:
- `position`
- `top`
- `z-index`
- `display`
- `flex-direction`

### 4. Убедиться в единственном dev server

```bash
# Найти все процессы на порту 3000
netstat -ano | findstr :3000

# Убить все node процессы
taskkill /F /IM node.exe

# Запустить только один сервер
npm run dev
```

### 5. Попробовать простейший тест

Создать минимальный test case в отдельном файле:

```typescript
// TestPositioning.tsx
export default function TestPositioning() {
  return (
    <div className="relative w-[35px] h-[120px] border">
      <button
        className="absolute left-1/2 -translate-x-1/2 text-red-600"
        style={{ top: 0, zIndex: 30 }}
      >
        ×
      </button>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '24px', zIndex: 10 }}
      >
        <input type="checkbox" />
      </div>
    </div>
  );
}
```

Если даже это не работает → проблема в глобальных стилях или Tailwind конфигурации.

---

## Затронутые файлы

### Основные изменения

1. **str-matcher/src/components/str-matcher/AdvancedMatchesTable.tsx**
   - Добавлен state `markerFilters`
   - Добавлена функция `toggleMarkerFilter`
   - Добавлена кнопка удаления маркера (строки 197-207)
   - Добавлен чекбокс фильтрации (строки 208-217)
   - Изменен `<th>` padding: `py-2` → `pb-2` (строка 196)

2. **str-matcher/src/components/str-matcher/BackendSearch.tsx**
   - Добавлена функция `handleRemoveMarker` (строки 164-195)
   - Добавлен prop `onRemoveMarker` в AdvancedMatchesTable (строка 420)

### Связанная документация

- `docs/MARKER-DISPLAY-LOGIC.md` - логика отображения маркеров
- `docs/MARKER-PANEL-FILTERING.md` - фильтрация по панелям маркеров

---

## Выводы

После 20+ попыток различных подходов к решению проблемы позиционирования, задача не была выполнена успешно.

**Функциональность работает**:
- ✅ Удаление маркера работает
- ✅ Фильтрация по чекбоксу работает
- ✅ Tooltip отображается

**Не работает**:
- ❌ Визуальное позиционирование: чекбокс отображается выше крестика вместо ниже

Код в файле выглядит корректно и должен работать по теории CSS. Проблема требует глубокого исследования через DevTools браузера для понимания почему inline styles не применяются или переопределяются.

**Статус**: Требуется дальнейшее исследование с использованием browser DevTools и возможно полный рефакторинг подхода к layout (например, переход на flexbox).

---

**Автор попыток**: Claude (Sonnet 4.5)
**Продолжительность работы**: ~2 часа
**Количество попыток**: 20+
**Конечный результат**: НЕУДАЧНО
