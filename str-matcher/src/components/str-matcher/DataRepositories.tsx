"use client";

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Upload, Plus, Database, Filter, ArrowUpDown } from 'lucide-react';
import DataSourceCard from './DataSourceCard';
import { selectUserSettings, addCustomRepository } from '@/store/userProfile';
import type { STRProfile, Repository } from '@/utils/constants';
import { dbManager } from '@/utils/storage/indexedDB';
import { parseCSVData } from '@/utils/dataProcessing';
import { DEFAULT_REPOS } from '@/config/repositories.config';
import { useTranslation } from '@/hooks/useTranslation';
import styles from './DataRepositories.module.css';
import '@/syles/DataRepositories.css'; // Import the new CSS file

interface DataRepositoriesProps {
 onLoadData: (url: string, type: string, sheetName?: string) => Promise<void>;
 setDatabase: (profiles: STRProfile[]) => void;
}

const DataRepositories: React.FC<DataRepositoriesProps> = ({ onLoadData, setDatabase }) => {
 const { t } = useTranslation();
 const [repositories, setRepositories] = useState<Repository[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [isAdding, setIsAdding] = useState(false);
 const [loading, setLoading] = useState(false);
 const [loadingRepo, setLoadingRepo] = useState<string | null>(null); // Для отслеживания загрузки конкретного репозитория
 const [progress, setProgress] = useState(0);
 const [error, setError] = useState<string | null>(null);
 const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
 const [activeFilter, setActiveFilter] = useState<string>('all');
 const [sortOrder, setSortOrder] = useState<string>('name');
 const [newRepo, setNewRepo] = useState({
   name: '',
   description: '',
   category: '',
   url: '',
   type: 'google_sheet' as const
 });

 const dispatch = useDispatch();
 const userSettings = useSelector(selectUserSettings);

 useEffect(() => {
   setRepositories([...DEFAULT_REPOS, ...userSettings.customRepositories]);
 }, [userSettings.customRepositories]);

 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
   const file = event.target.files?.[0];
   if (!file) return;

   setLoading(true);
   setProgress(0);
   setError(null);

   try {
      await dbManager.init();
      const profiles = await parseCSVData(await file.text());
      
      // Получаем существующие профили
      const existingProfiles = await dbManager.getProfiles();
      const existingKits = new Set(existingProfiles.map(p => p.kitNumber));
      
      // Фильтруем только новые профили
      const newProfiles = profiles.filter(p => !existingKits.has(p.kitNumber));
      
      // Сохраняем комбинацию существующих и новых профилей
      await dbManager.saveProfiles([...existingProfiles, ...newProfiles]);
      setDatabase(await dbManager.getProfiles());
   } catch (error: any) {
     console.error('Error processing file:', error);
     setError(t('database.processingError', { message: error.message }));
   } finally {
     setLoading(false);
     setProgress(0);
   }
 };
 const loadChunkedJson = async (repository: Repository) => {
  const { url, chunks = 1 } = repository;
  const profiles: STRProfile[] = [];
  const batchSize = 4; // Загружаем по 4 чанка за раз
 
  for (let batch = 0; batch < chunks; batch += batchSize) {
    const endBatch = Math.min(batch + batchSize, chunks);
    const batchPromises = [];
 
    for (let i = batch; i < endBatch; i++) {
      const promise = fetch(`${url}${i}.json`)
        .then(response => response.json())
        .then(chunkData => chunkData.map((profile: any) => ({
          ...profile,
          kitNumber: profile.kitNumber || `AUTO_${i}_${Date.now()}_${Math.random().toString(36).slice(2)}`
        })))
        .catch(error => {
          console.error(`Error loading chunk ${i}:`, error);
          return [];
        });
      batchPromises.push(promise);
    }
 
    const batchResults = await Promise.all(batchPromises);
    profiles.push(...batchResults.flat());
  }
 
  return profiles;
 };

// Обновленная функция загрузки выбранных репозиториев
const handleLoadSelected = async (repoIds: string[]) => {
  console.log("=== Начало загрузки репозиториев ===");
  setLoading(true);
  setError(null);

  try {
    console.log("Инициализация базы данных...");
    await dbManager.init();

    for (const repoId of repoIds) {
      setLoadingRepo(repoId); // Устанавливаем ID текущего загружаемого репозитория
      const repo = repositories.find(r => r.id === repoId);
      if (!repo?.url) continue;

      console.log(`Загрузка репозитория ${repo.name}...`);
      
      if (repo.type === 'chunked_json') {
        const profiles = await loadChunkedJson(repo);
        await dbManager.saveProfiles(profiles);
      } else {
        const response = await fetch(repo.url);
        if (!response.ok) throw new Error(t('database.loadError', { name: repo.name }));
          
        console.log("Получение CSV данных...");
        const csvData = await response.text();
        console.log(`CSV данные получены, размер: ${csvData.length} байт`);
        
        console.log("Парсинг CSV...");
        const profiles = await parseCSVData(csvData, setProgress);
        console.log(`Распаршено ${profiles.length} профилей`);
        
        console.log("Сохранение в IndexedDB...");
        await dbManager.saveProfiles(profiles);
        console.log("Профили сохранены");
      }
    }

    console.log("Получение всех профилей...");
    setDatabase(await dbManager.getProfiles());
    console.log("=== Загрузка завершена ===");

  } catch (error) {
    console.error('=== Ошибка загрузки ===', error);
    setError(t('database.loadErrorWithMessage', { message: error instanceof Error ? error.message : 'Unknown error' }));
  } finally {
    setLoading(false);
    setLoadingRepo(null);
    setProgress(0);
  }
};

// Функция загрузки одного репозитория
const handleLoadSingle = async (repoId: string) => {
  setLoadingRepo(repoId);
  await handleLoadSelected([repoId]);
};

 // Применяем фильтры
 const filteredRepos = repositories.filter(repo => {
   // Фильтр по поисковому запросу
   const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       repo.category?.toLowerCase().includes(searchTerm.toLowerCase());
   
   // Фильтр по категории
   const matchesCategory = activeFilter === 'all' || 
                         (repo.category?.toLowerCase() === activeFilter.toLowerCase());
   
   return matchesSearch && matchesCategory;
 });
 
 // Сортировка репозиториев
 const sortedRepos = [...filteredRepos].sort((a, b) => {
   switch (sortOrder) {
     case 'name':
       return a.name.localeCompare(b.name);
     case 'category':
       return (a.category || '').localeCompare(b.category || '');
     default:
       return 0;
   }
 });

 const toggleRepository = (repoId: string) => {
   setSelectedRepos(prev =>
     prev.includes(repoId)
       ? prev.filter(id => id !== repoId)
       : [...prev, repoId]
   );
 };

 const handleAddRepository = () => {
   if (newRepo.name && newRepo.url) {
     dispatch(addCustomRepository({
       ...newRepo,
       id: Date.now().toString()
     }));
     setNewRepo({
       name: '',
       description: '',
       category: '',
       url: '',
       type: 'google_sheet'
     });
     setIsAdding(false);
   }
 };

 return (
   <div className="space-y-5">
     {/* Заголовок секции */}
     <div className="flex items-center justify-between border-b border-flat-border pb-2 mb-3">
       <div className="flex items-center gap-2">
         <Database className="h-5 w-5 text-flat-primary" />
         <h2 className="text-xl font-bold data-repo-title">
           {t('database.dataSources')}
         </h2>
         <span className="inline-flex items-center justify-center px-2 py-1 ml-2 text-xs font-medium rounded-full bg-flat-primary/10 text-flat-primary data-repo-badge">
           {repositories.length}
         </span>
       </div>
       
       <div className="flex gap-2">
         <input
           type="file"
           accept=".csv"
           onChange={handleFileUpload}
           className="hidden"
           id="file-upload"
         />
         <label
           htmlFor="file-upload"
           className="flex items-center gap-1 px-2 py-1 text-xs bg-flat-primary text-white rounded hover:bg-flat-primary/90 cursor-pointer transition-all border border-transparent upload-label"
         >
           <Upload className="h-3 w-3" />
           {t('database.uploadFile')}
         </label>
         <button
           onClick={() => setIsAdding(!isAdding)}
           className="flex items-center gap-1 px-2 py-1 text-xs bg-flat-success text-white rounded hover:bg-flat-success/90 transition-all border border-transparent"
         >
           <Plus className="h-3 w-3" />
           {isAdding ? t('common.cancel') : t('database.addSource')}
         </button>
       </div>
     </div>
     
     {/* Поле поиска и фильтры */}
     <div className="flex flex-wrap gap-2 items-center mb-3">
       <div className="relative flex-1 min-w-[200px]">
         <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
         <input
           type="text"
           placeholder={t('database.searchSources')}
           className="w-full h-8 pl-8 pr-3 text-sm bg-flat-background border border-flat-border rounded focus:outline-none focus:border-flat-primary focus:ring-1 focus:ring-flat-primary/30 transition-all"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
       </div>
       
       <div className="flex items-center gap-1 ml-auto">
         <Filter className="h-3.5 w-3.5 text-text-secondary" />
         <span className="text-xs text-text-secondary">{t('common.filters')}:</span>
         <div className="flex gap-1">
           <button 
             onClick={() => setActiveFilter('all')}
             className={`px-2 py-0.5 text-xs rounded transition-all ${activeFilter === 'all' ? 'bg-flat-primary text-white' : 'bg-flat-background text-text-secondary hover:bg-flat-background/80'}`}
           >
             {t('common.all')}
           </button>
           <button 
             onClick={() => setActiveFilter('Y-DNA')}
             className={`px-2 py-0.5 text-xs rounded transition-all ${activeFilter === 'Y-DNA' ? 'bg-flat-primary text-white' : 'bg-flat-background text-text-secondary hover:bg-flat-background/80'}`}
           >
             Y-DNA
           </button>
           <button 
             onClick={() => setActiveFilter('mtDNA')}
             className={`px-2 py-0.5 text-xs rounded transition-all ${activeFilter === 'mtDNA' ? 'bg-flat-primary text-white' : 'bg-flat-background text-text-secondary hover:bg-flat-background/80'}`}
           >
             mtDNA
           </button>
         </div>
         
         <div className="flex items-center gap-1 ml-2">
           {/* Visually hidden label for accessibility */}
           <label htmlFor="sortOrderSelect" className="sr-only">
             {t('common.sortBy')}
           </label>
           <select
             id="sortOrderSelect"
             aria-label={t('common.sortBy')}
             value={sortOrder}
             onChange={(e) => setSortOrder(e.target.value)}
             className="sort-order-select bg-flat-background border border-flat-border rounded text-xs px-2 py-0.5 text-text-secondary"
           >
             <option value="name">{t('common.byName')}</option>
             <option value="category">{t('common.byCategory')}</option>
           </select>
         </div>
       </div>
     </div>

     {error && (
       <div className="p-2 mb-2 text-xs text-flat-danger bg-flat-danger/10 rounded border border-flat-danger/30 error-message">
         {error}
       </div>
     )}

     {loading && !loadingRepo && (
       <div className="text-center py-2 mb-2">
         <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-flat-primary/30 border-t-flat-primary" />
         <p className="mt-1 text-xs text-text-secondary progress-text">
           {Math.round(progress)}%
         </p>
       </div>
     )}

     {isAdding && (
       <div className="space-y-4 p-6 border border-flat-border rounded-lg bg-flat-background shadow-sm">
         <div className="flex flex-col gap-1">
           <label className="text-sm font-medium text-text-secondary form-label">
             {t('database.sourceName')}
           </label>
           <input
             type="text"
             className="w-full p-3 border border-flat-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-flat-primary/30 focus:border-flat-primary transition-all form-input"
             placeholder={t('database.sourceNamePlaceholder')}
             value={newRepo.name}
             onChange={e => setNewRepo(prev => ({ ...prev, name: e.target.value }))}
           />
         </div>
         
         <div className="flex flex-col gap-1">
           <label className="text-sm font-medium text-text-secondary form-label">
             {t('database.sourceDescription')}
           </label>
           <input
             type="text"
             className="w-full p-3 border border-flat-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-flat-primary/30 focus:border-flat-primary transition-all form-input"
             placeholder={t('database.sourceDescriptionPlaceholder')}
             value={newRepo.description}
             onChange={e => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
           />
         </div>
         
         <div className="flex flex-col gap-1">
           <label className="text-sm font-medium text-text-secondary category-label">
             {t('database.sourceCategory')}
           </label>
           <select
             className="category-select w-full p-3 border border-flat-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-flat-primary/30 focus:border-flat-primary transition-all"
             value={newRepo.category}
             onChange={e => setNewRepo(prev => ({ ...prev, category: e.target.value }))}
             aria-label={t('database.sourceCategory')}
           >
             <option value="">{t('common.select')}</option>
             <option value="Y-DNA">Y-DNA</option>
             <option value="mtDNA">mtDNA</option>
             <option value="Other">Other</option>
           </select>
         </div>
         
         <div className="flex flex-col gap-1">
           <label className="text-sm font-medium text-text-secondary form-label">
             {t('database.sourceUrl')}
           </label>
           <input
             type="text"
             className="w-full p-3 border border-flat-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-flat-primary/30 focus:border-flat-primary transition-all create-button"
             placeholder={t('database.sourceUrlPlaceholder')}
             value={newRepo.url}
             onChange={e => setNewRepo(prev => ({ ...prev, url: e.target.value }))}
           />
         </div>
         
         <button
           onClick={handleAddRepository}
           className="w-full px-4 py-3 mt-2 bg-flat-primary text-white rounded-md hover:bg-flat-primary/90 transition-all font-medium form-input"
         >
           {t('common.create')}
         </button>
       </div>
     )}

    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5">
      {sortedRepos.map(repo => (
        <DataSourceCard
          key={repo.id}
          repository={repo}
          isSelected={selectedRepos.includes(repo.id)}
          onToggle={() => toggleRepository(repo.id)}
          onLoad={() => handleLoadSingle(repo.id)}
          loading={loadingRepo === repo.id}
        />
      ))}
    </div>

     {selectedRepos.length > 0 && (
       <div className="sticky bottom-4 right-4 left-4 p-4 bg-white border border-flat-border rounded-lg shadow-lg z-10">
         <button
           onClick={() => handleLoadSelected(selectedRepos)}
           className="w-full px-4 py-3 text-sm bg-flat-primary text-white rounded-md hover:bg-flat-primary/90 transition-all disabled:opacity-50 font-medium flex items-center justify-center gap-2 load-selected-button"
           disabled={loading}
         >
           {loading ? (
             <>
               <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
               {t('common.loading')}
             </>
           ) : (
             <>
               <Database className="h-4 w-4" />
               {t('database.loadSelected', { count: selectedRepos.length })}
             </>
           )}
         </button>
       </div>
     )}
   </div>
 );
};

export default DataRepositories;