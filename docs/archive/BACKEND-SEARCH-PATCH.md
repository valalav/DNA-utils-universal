# BackendSearch.tsx - Патч для интеграции селектора гаплогрупп

## Изменения, которые нужно внести:

### 1. Добавить импорт HaplogroupSelector (после строки 12):

```typescript
import HaplogroupSelector from './HaplogroupSelector';
```

### 2. Добавить состояние selectedHaplogroup (после строки 28):

```typescript
const [selectedHaplogroup, setSelectedHaplogroup] = useState('');
```

### 3. Добавить HaplogroupSelector в JSX (после строки 220, перед </div> блока настроек):

Найти блок с maxDistance и maxResults и добавить после него:

```typescript
<HaplogroupSelector
  selectedHaplogroup={selectedHaplogroup}
  onHaplogroupChange={setSelectedHaplogroup}
  minProfiles={500}
/>
```

### 4. Обновить вызов findMatches для поиска по Kit Number (строка 59-63):

Заменить:
```typescript
const searchMatches = await findMatches({
  markers: foundProfile.markers,
  maxDistance,
  limit: maxResults,
});
```

На:
```typescript
const searchMatches = await findMatches({
  markers: foundProfile.markers,
  maxDistance,
  limit: maxResults,
  haplogroupFilter: selectedHaplogroup || undefined,
});
```

### 5. Обновить вызов findMatches для поиска по маркерам (строка 89-93):

Заменить:
```typescript
const searchMatches = await findMatches({
  markers: markersToSearch,
  maxDistance,
  limit: maxResults,
});
```

На:
```typescript
const searchMatches = await findMatches({
  markers: markersToSearch,
  maxDistance,
  limit: maxResults,
  haplogroupFilter: selectedHaplogroup || undefined,
});
```

## Полный код блока настроек с селектором (замена строк 186-221):

```typescript
{/* Compact Search Settings */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-gray-700">Max Genetic Distance</label>
    <div className="relative">
      <input
        type="number"
        value={maxDistance}
        onChange={(e) => setMaxDistance(parseInt(e.target.value) || 5)}
        min="0"
        max="50"
        className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-sm"
        placeholder="5"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <span className="text-gray-400 text-xs font-semibold">GD</span>
      </div>
    </div>
  </div>
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-gray-700">Max Results</label>
    <div className="relative">
      <input
        type="number"
        value={maxResults}
        onChange={(e) => setMaxResults(parseInt(e.target.value) || 50)}
        min="1"
        max="1000"
        className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-sm"
        placeholder="50"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <span className="text-gray-400 text-xs font-semibold">MAX</span>
      </div>
    </div>
  </div>
</div>

{/* Haplogroup Selector */}
<HaplogroupSelector
  selectedHaplogroup={selectedHaplogroup}
  onHaplogroupChange={setSelectedHaplogroup}
  minProfiles={500}
/>
```

## Результат после применения патча:

✅ Пользователь увидит выпадающий список с гаплогруппами
✅ Каждая гаплогруппа показывает количество профилей
✅ Фильтрация работает автоматически при выборе гаплогруппы
✅ Опция "All Haplogroups" позволяет искать по всей базе
✅ При выборе гаплогруппы показывается индикатор фильтрации

## Тестирование:

1. Откройте http://localhost:3000/backend-search
2. Выберите гаплогруппу из списка (например, I-M253 с 24,181 профилем)
3. Введите kit number или маркеры
4. Нажмите Search
5. Результаты будут отфильтрованы только по выбранной гаплогруппе
