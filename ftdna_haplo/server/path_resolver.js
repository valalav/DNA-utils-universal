/**
 * path_resolver.js
 * 
 * Модуль для улучшенного определения путей гаплогрупп на основе
 * структуры данных и связей между узлами без использования хардкодированных путей.
 */

const axios = require('axios').default;

class PathResolver {
    /**
     * Инициализирует новый экземпляр PathResolver
     * @param {Object} ftdnaTree - Экземпляр класса HaploTree с данными FTDNA
     */
    constructor(ftdnaTree) {
        this.ftdnaTree = ftdnaTree;
        this.pathCache = new Map(); // Кэш для путей гаплогрупп
    }

    /**
     * Вычисляет полный путь для гаплогруппы
     * @param {string} haplogroupName - Имя гаплогруппы
     * @returns {Array} - Массив узлов пути от корня к гаплогруппе
     */
    async resolvePath(haplogroupName) {
        console.log(`Resolving path for haplogroup: ${haplogroupName}`);

        // Проверяем кэш
        if (this.pathCache.has(haplogroupName)) {
            console.log(`Using cached path for ${haplogroupName}`);
            return this.pathCache.get(haplogroupName);
        }

        const haplo = this.ftdnaTree.findHaplogroup(haplogroupName);
        if (!haplo) {
            console.log(`Haplogroup ${haplogroupName} not found in the local database`);
            return null;
        }

        // Получаем основной путь из дерева
        const basePath = this.buildPathFromGraph(haplo.haplogroupId);
        if (!basePath || basePath.length === 0) {
            console.log(`Failed to build basic path for ${haplogroupName}`);
            return null;
        }

        // Пытаемся дополнить путь информацией из FTDNA API, если есть разрывы
        const hasGaps = this.checkForPathGaps(basePath);
        let completePath = basePath;

        if (hasGaps) {
            console.log(`Path for ${haplogroupName} has gaps, attempting to resolve from FTDNA API`);
            try {
                const apiPath = await this.fetchPathFromFtdnaApi(haplogroupName);
                if (apiPath && apiPath.length > 0) {
                    completePath = this.mergePaths(basePath, apiPath);
                }
            } catch (err) {
                console.error(`Error fetching path from FTDNA API: ${err.message}`);
            }
        }

        // Сохраняем в кэш
        this.pathCache.set(haplogroupName, completePath);
        return completePath;
    }

    /**
     * Построение пути на основе локального графа
     * @param {string|number} nodeId - ID узла
     * @returns {Array} - Массив узлов пути
     */
    buildPathFromGraph(nodeId) {
        const path = [];
        const visitedIds = new Set(); // Предотвращение зацикливаний
        
        // Строим цепочку предков
        const buildAncestorChain = (startNodeId) => {
            const ancestors = [];
            let node = this.ftdnaTree.haplogroups[startNodeId];
            
            while (node && !visitedIds.has(node.haplogroupId)) {
                visitedIds.add(node.haplogroupId);
                ancestors.push(node);
                
                if (!node.parentId) break;
                node = this.ftdnaTree.haplogroups[node.parentId];
            }
            
            return ancestors;
        };
        
        // Получаем цепочку предков
        const ancestors = buildAncestorChain(nodeId);
        
        // Формируем путь от корня к узлу
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const node = ancestors[i];
            const snps = node.variants?.map(v => v.variant || v.snp).filter(Boolean) || [];
            
            path.push({
                id: node.haplogroupId,
                name: node.name,
                variants: snps,
                displayName: node.name
            });
        }
        
        return path;
    }

    /**
     * Проверяет наличие разрывов в пути
     * @param {Array} path - Массив узлов пути
     * @returns {boolean} - true если есть разрывы, иначе false
     */
    checkForPathGaps(path) {
        if (!path || path.length < 2) return false;
        
        for (let i = 0; i < path.length - 1; i++) {
            const currentNode = this.ftdnaTree.haplogroups[path[i].id];
            const nextNode = this.ftdnaTree.haplogroups[path[i+1].id];
            
            // Если есть разрыв в пути (следующий узел не является дочерним для текущего)
            if (currentNode && nextNode && !currentNode.children?.includes(nextNode.haplogroupId)) {
                console.log(`Gap detected between ${currentNode.name} and ${nextNode.name}`);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Запрашивает путь из FTDNA API
     * @param {string} haplogroupName - Имя гаплогруппы
     * @returns {Array} - Массив узлов пути из API
     */
    async fetchPathFromFtdnaApi(haplogroupName) {
        try {
            // Здесь может быть реализован запрос к FTDNA API для получения данных
            // В данном примере мы эмулируем этот запрос
            console.log(`Fetching path for ${haplogroupName} from FTDNA API`);
            
            // Возвращаем пустой массив, так как это заглушка
            // В реальной реализации здесь должен быть запрос к API
            return [];
        } catch (err) {
            console.error(`FTDNA API error: ${err.message}`);
            return [];
        }
    }

    /**
     * Объединяет два пути с учетом приоритета API-пути
     * @param {Array} localPath - Локальный путь
     * @param {Array} apiPath - Путь из API
     * @returns {Array} - Объединенный путь
     */
    mergePaths(localPath, apiPath) {
        if (!apiPath || apiPath.length === 0) return localPath;
        if (!localPath || localPath.length === 0) return apiPath;
        
        // Здесь должна быть логика объединения путей
        // Для простоты примера просто возвращаем локальный путь
        return localPath;
    }
}

module.exports = PathResolver;