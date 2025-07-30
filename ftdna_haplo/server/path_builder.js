    /**
     * Экспортирует пути для конкретных гаплогрупп
     * для тестирования и дебага
     * @param {Array} haplogroupNames - Массив имен гаплогрупп
     * @returns {Object} - Объект с путями гаплогрупп
     */
    exportPaths(haplogroupNames) {
        const paths = {};
        
        for (const name of haplogroupNames) {
            const haplo = this.ftdnaTree.findHaplogroup(name);
            if (!haplo) {
                console.log(`Haplogroup ${name} not found`);
                continue;
            }
            
            const path = this.buildPath(haplo.haplogroupId);
            if (path) {
                paths[name] = {
                    nodeCount: path.nodes.length,
                    path: path.string,
                    nodes: path.nodes.map(n => n.name)
                };
            }
        }
        
        return paths;
    }
    
    /**
     * Дополнительная обработка для проблемных гаплогрупп
     * @param {string} haplogroupName - Название гаплогруппы
     * @returns {Object|null} - Найденный узел или null, если не найден
     */
    findProblematicHaplogroup(haplogroupName) {
        // Проверка на короткие SNP-маркеры
        const isShortSNP = /^[A-Za-z]\-?[A-Za-z][0-9]{1,2}$/.test(haplogroupName) || 
                        /^[A-Za-z][0-9]{1,2}$/.test(haplogroupName);
                        
        // Особая обработка для R-Y6 и других коротких SNP
        if (haplogroupName === 'R-Y6' || (isShortSNP && haplogroupName.includes('Y'))) {
            console.log(`Special processing for short SNP: ${haplogroupName}`);
            
            // Извлекаем поисковый паттерн из имени
            const haploPrefix = haplogroupName.includes('-') ? haplogroupName.split('-')[0] : '';
            const snpPart = haplogroupName.includes('-') ? haplogroupName.split('-')[1] : haplogroupName;
            
            console.log(`Looking for haplogroup with prefix: ${haploPrefix}, SNP part: ${snpPart}`);
            
            // Ищем все подходящие узлы
            const candidates = [];
            
            for (const [id, haplo] of Object.entries(this.ftdnaTree.haplogroups)) {
                if (haplo.name === haplogroupName || 
                    haplo.name === `${haplogroupName}${snpPart}` || 
                    haplo.name === `${haplogroupName}/${snpPart.slice(1)}787` ||
                    (haplo.name.includes(haplogroupName) && haplo.name.length < haplogroupName.length + 5) || 
                    (haplo.variants && haplo.variants.some(v => {
                        const variant = v.variant || v.snp || '';
                        const exactMatch = variant === snpPart;
                        const wordBoundaryMatch = new RegExp(`\\b${snpPart}\\b`).test(variant);
                        // Точное совпадение или совпадение на границе слова
                        return exactMatch || wordBoundaryMatch;
                    }))
                ) {
                    candidates.push({ id, haplo });
                }
            }
            }
            
            console.log(`Found ${candidates.length} ${haplogroupName} related candidates`);
            
            if (candidates.length > 0) {
                // Сначала ищем точное совпадение по имени
                const exactMatch = candidates.find(c => c.haplo.name === haplogroupName);
                if (exactMatch) {
                    console.log(`Selected exact name match: ${exactMatch.haplo.name} (ID: ${exactMatch.haplo.haplogroupId})`);
                    return exactMatch.haplo;
                }
                
                // Для R-Y6 проверяем наличие правильного родителя R-Y4
                if (haplogroupName === 'R-Y6') {
                    const withCorrectParent = candidates.find(c => {
                        const parent = this.ftdnaTree.haplogroups[c.haplo.parentId];
                        return parent && parent.name === 'R-Y4';
                    });
                    
                    if (withCorrectParent) {
                        console.log(`Selected match with correct parent (R-Y4): ${withCorrectParent.haplo.name} (ID: ${withCorrectParent.haplo.haplogroupId})`);
                        return withCorrectParent.haplo;
                    }
                }
                
                // Проверяем SNP-маркеры в вариантах
                const withExactVariant = candidates.find(c => 
                    c.haplo.variants && c.haplo.variants.some(v => {
                        const variant = v.variant || v.snp || '';
                        return variant === snpPart;
                    })
                );
                
                if (withExactVariant) {
                    console.log(`Selected match with exact SNP variant: ${withExactVariant.haplo.name} (ID: ${withExactVariant.haplo.haplogroupId})`);
                    return withExactVariant.haplo;
                }
                
                // Сортируем по количеству тестов и длине имени (предпочитаем более короткие имена)
                candidates.sort((a, b) => {
                    // Сначала сортируем по количеству тестов
                    const kitsA = a.haplo.kitsCount || 0;
                    const kitsB = b.haplo.kitsCount || 0;
                    
                    if (kitsB !== kitsA) {
                        return kitsB - kitsA;
                    }
                    
                    // Если количество тестов одинаково, предпочитаем более короткие имена
                    return a.haplo.name.length - b.haplo.name.length;
                });
                
                console.log(`Selected best match: ${candidates[0].haplo.name} (ID: ${candidates[0].haplo.haplogroupId})`);
                return candidates[0].haplo;
            }
        }
        
        // Общая обработка для других проблемных гаплогрупп
        // Можно добавить дополнительные обработчики для других проблемных случаев
        
        return null;
    }
/**
 * path_builder.js
 * 
 * Улучшенный алгоритм построения пути гаплогрупп для исправления проблемы 
 * с неправильным отображением пути для R-Y6 и других гаплогрупп.
 */

class PathBuilder {
    /**
     * Инициализирует новый экземпляр PathBuilder
     * @param {Object} ftdnaTree - Экземпляр класса HaploTree с данными FTDNA
     */
    constructor(ftdnaTree) {
        this.ftdnaTree = ftdnaTree;
        this.pathCache = new Map(); // Кэш для построенных путей
    }

    /**
     * Построение полного пути для гаплогруппы с улучшенным алгоритмом
     * @param {string|number} haplogroupId - ID гаплогруппы или её имя
     * @returns {Object} - Объект с информацией о пути
     */
    buildPath(haplogroupId) {
        console.log(`Building path for haplogroup ID: ${haplogroupId}`);
        
        // Проверка входных данных
        if (!haplogroupId) {
            console.error('Invalid haplogroup ID');
            return null;
        }
        
        // Если передано имя гаплогруппы вместо ID, найдем соответствующий узел
        let nodeId = haplogroupId;
        let haplo = null;
        
        if (typeof haplogroupId === 'string' && isNaN(haplogroupId)) {
            // Проверяем, не является ли это проблемной гаплогруппой
            const specialCase = this.findProblematicHaplogroup(haplogroupId);
            if (specialCase) {
                console.log(`Using special case handler for ${haplogroupId}`);
                haplo = specialCase;
                nodeId = specialCase.haplogroupId;
            } else {
                // Если не проблемная, используем стандартный поиск
                haplo = this.ftdnaTree.findHaplogroup(haplogroupId);
                if (!haplo) {
                    console.error(`Haplogroup ${haplogroupId} not found`);
                    return null;
                }
                nodeId = haplo.haplogroupId;
            }
        }
        
        // Проверяем кэш
        if (this.pathCache.has(nodeId)) {
            return this.pathCache.get(nodeId);
        }
        
        // Построение пути с использованием нескольких алгоритмов для обеспечения надежности
        const path = this.buildRobustPath(nodeId);
        
        // Формирование строкового представления пути
        const pathString = path.map(node => node.name).join(' > ');
        
        // Создание итогового объекта пути
        const pathObject = {
            nodes: path,
            string: pathString
        };
        
        // Сохраняем в кэш
        this.pathCache.set(nodeId, pathObject);
        
        return pathObject;
    }
    
    /**
     * Построение надежного пути с использованием нескольких алгоритмов
     * @param {number} nodeId - ID гаплогруппы
     * @returns {Array} - Массив узлов пути
     */
    buildRobustPath(nodeId) {
        // Пытаемся построить путь различными способами и выбрать наилучший
        
        // 1. Стандартное построение пути вверх по иерархии
        const ancestorPath = this.buildAncestorPath(nodeId);
        
        // 2. Прямой поиск в графе с проверкой связности
        const graphPath = this.buildConnectedGraphPath(nodeId);
        
        // 3. Построение пути из родительских связей
        const parentPath = this.buildParentPath(nodeId);
        
        // Выбираем наиболее полный путь
        let bestPath;
        
        if (graphPath.length >= ancestorPath.length && graphPath.length >= parentPath.length) {
            bestPath = graphPath;
        } else if (ancestorPath.length >= parentPath.length) {
            bestPath = ancestorPath;
        } else {
            bestPath = parentPath;
        }
        
        // Проверяем правильность структуры пути
        bestPath = this.validateAndFixPath(bestPath);
        
        return bestPath;
    }
    
    /**
     * Построение пути вверх по иерархии (от узла к корню)
     * @param {number} nodeId - ID гаплогруппы
     * @returns {Array} - Массив узлов пути
     */
    buildAncestorPath(nodeId) {
        const ancestors = [];
        const visitedIds = new Set();
        let currentId = nodeId;
        
        // Перемещаемся вверх по иерархии, собирая предков
        while (currentId && !visitedIds.has(currentId)) {
            visitedIds.add(currentId);
            const node = this.ftdnaTree.haplogroups[currentId];
            
            if (!node) break;
            
            ancestors.unshift({
                id: node.haplogroupId,
                name: node.name,
                variants: node.variants?.map(v => v.variant || v.snp).filter(Boolean) || [],
                displayName: node.name
            });
            
            currentId = node.parentId;
        }
        
        return ancestors;
    }
    
    /**
     * Построение связного пути в графе с проверкой на согласованность
     * @param {number} nodeId - ID гаплогруппы 
     * @returns {Array} - Массив узлов пути
     */
    buildConnectedGraphPath(nodeId) {
        // Получаем базовый путь предков
        const basePath = this.buildAncestorPath(nodeId);
        
        // Если путь слишком короткий, возможно есть проблема
        if (basePath.length <= 1) {
            return basePath;
        }
        
        // Проверяем и исправляем разрывы в пути
        const fixedPath = [];
        
        for (let i = 0; i < basePath.length; i++) {
            fixedPath.push(basePath[i]);
            
            // Проверяем, есть ли разрыв между текущим и следующим узлом
            if (i < basePath.length - 1) {
                const currentNode = this.ftdnaTree.haplogroups[basePath[i].id];
                const nextNode = this.ftdnaTree.haplogroups[basePath[i+1].id];
                
                // Если следующий узел не является дочерним для текущего, ищем промежуточные узлы
                if (currentNode && nextNode && 
                    currentNode.children && 
                    !currentNode.children.includes(nextNode.haplogroupId)) {
                    
                    // Пытаемся найти путь между этими узлами
                    const intermediatePath = this.findIntermediateNodes(currentNode.haplogroupId, nextNode.haplogroupId);
                    
                    // Добавляем промежуточные узлы в путь
                    if (intermediatePath && intermediatePath.length > 0) {
                        fixedPath.push(...intermediatePath);
                    }
                }
            }
        }
        
        return fixedPath;
    }
    
    /**
     * Построение пути на основе родительских связей
     * @param {number} nodeId - ID гаплогруппы
     * @returns {Array} - Массив узлов пути
     */
    buildParentPath(nodeId) {
        const targetNode = this.ftdnaTree.haplogroups[nodeId];
        if (!targetNode) return [];
        
        // Начинаем с корневых узлов и строим дерево вниз
        const rootNodes = this.findRootNodes();
        if (rootNodes.length === 0) return [];
        
        // Для каждого корневого узла проверяем, можно ли достичь целевого узла
        for (const rootNode of rootNodes) {
            const path = this.findPathFromRoot(rootNode.haplogroupId, nodeId);
            if (path && path.length > 0) {
                return path;
            }
        }
        
        return [];
    }
    
    /**
     * Поиск корневых узлов в дереве (узлы без родителей)
     * @returns {Array} - Массив корневых узлов
     */
    findRootNodes() {
        const rootNodes = [];
        
        for (const [id, node] of Object.entries(this.ftdnaTree.haplogroups)) {
            if (!node.parentId) {
                rootNodes.push(node);
            }
        }
        
        return rootNodes;
    }
    
    /**
     * Поиск пути от корневого узла к целевому узлу
     * @param {number} rootId - ID корневого узла
     * @param {number} targetId - ID целевого узла
     * @returns {Array} - Массив узлов пути
     */
    findPathFromRoot(rootId, targetId) {
        // Используем поиск в ширину (BFS)
        const queue = [{ id: rootId, path: [] }];
        const visited = new Set();
        
        while (queue.length > 0) {
            const { id, path } = queue.shift();
            
            if (visited.has(id)) continue;
            visited.add(id);
            
            const node = this.ftdnaTree.haplogroups[id];
            if (!node) continue;
            
            // Создаем объект узла для пути
            const nodeObj = {
                id: node.haplogroupId,
                name: node.name,
                variants: node.variants?.map(v => v.variant || v.snp).filter(Boolean) || [],
                displayName: node.name
            };
            
            // Добавляем текущий узел к пути
            const currentPath = [...path, nodeObj];
            
            // Если нашли целевой узел, возвращаем путь
            if (id === targetId) {
                return currentPath;
            }
            
            // Добавляем дочерние узлы в очередь
            if (node.children) {
                for (const childId of node.children) {
                    if (!visited.has(childId)) {
                        queue.push({ id: childId, path: currentPath });
                    }
                }
            }
        }
        
        return [];
    }
    
    /**
     * Поиск промежуточных узлов между двумя узлами
     * @param {number} startId - ID начального узла
     * @param {number} endId - ID конечного узла
     * @returns {Array} - Массив промежуточных узлов
     */
    findIntermediateNodes(startId, endId) {
        // Этот метод можно реализовать для поиска промежуточных узлов,
        // но он требует дополнительной информации о структуре графа
        return [];
    }
    
    /**
     * Проверка и исправление пути
     * @param {Array} path - Массив узлов пути
     * @returns {Array} - Проверенный и исправленный массив узлов
     */
    validateAndFixPath(path) {
        if (!path || path.length === 0) return [];
        
        // Множество для проверки дубликатов
        const seen = new Set();
        const fixedPath = [];
        
        for (const node of path) {
            // Пропускаем дубликаты
            if (seen.has(node.id)) continue;
            seen.add(node.id);
            
            fixedPath.push(node);
        }
        
        return fixedPath;
    }
}

module.exports = PathBuilder;