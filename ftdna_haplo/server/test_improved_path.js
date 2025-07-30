/**
 * Тестирование улучшенного механизма построения путей гаплогрупп
 * с использованием PathBuilder для проблемных случаев, включая R-Y6
 */

const fs = require('fs');
const path = require('path');
const { HaploTree } = require('./haplo_functions');
const PathBuilder = require('./path_builder');
const HaplogroupService = require('./services/haplogroup-service');

// Список гаплогрупп для тестирования (включая известные проблемные случаи)
const testHaplogroups = [
    'R-Y6',           // Основной проблемный случай
    'R-Y4',           // Предок R-Y6
    'R-Y28',          // Предок R-Y4
    'R-M459',         // Предок в цепочке R-Y6
    'R-Z93',          // Предок в цепочке R-Y6
    'R-L657',         // Предок в цепочке R-Y6
    'J-M267',         // Другая гаплогруппа для теста
    'E-M35',          // Другая гаплогруппа для теста
    'I-M170'          // Другая гаплогруппа для теста
];

try {
    console.log('Loading FTDNA tree data...');
    const ftdnaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/get.json'), 'utf8'));
    
    // Создаем экземпляры классов
    const tree = new HaploTree(ftdnaData);
    const pathBuilder = new PathBuilder(tree);
    
    // Имитация HaplogroupService (только с FTDNA)
    const haplogroupService = {
        ftdnaTree: tree,
        pathBuilder: pathBuilder
    };
    
    console.log('\n=== TESTING IMPROVED PATH GENERATION ===');
    
    for (const haplogroupName of testHaplogroups) {
        console.log(`\n\nTESTING HAPLOGROUP: ${haplogroupName}\n${'-'.repeat(50)}`);
        
        // 1. Поиск гаплогруппы
        console.log(`1. Finding haplogroup ${haplogroupName}...`);
        const haplo = tree.findHaplogroup(haplogroupName);
        
        if (!haplo) {
            console.log(`  ERROR: Haplogroup ${haplogroupName} not found!`);
            continue;
        }
        
        console.log(`  - Found: ${haplo.name} (ID: ${haplo.haplogroupId})`);
        console.log(`  - Parent: ${haplo.parentId ? tree.haplogroups[haplo.parentId]?.name || 'Unknown' : 'None'}`);
        console.log(`  - Variants: ${(haplo.variants || []).map(v => v.variant || v.snp).filter(Boolean).join(', ')}`);
        
        // 2. Получение пути с использованием PathBuilder
        console.log(`\n2. Getting path using PathBuilder...`);
        const pathBuilderResult = pathBuilder.buildPath(haplo.haplogroupId);
        
        if (pathBuilderResult) {
            console.log(`  - Path length: ${pathBuilderResult.nodes.length} nodes`);
            console.log(`  - Path: ${pathBuilderResult.string}`);
            
            // Проверка начала и конца пути
            if (pathBuilderResult.nodes.length > 0) {
                console.log(`  - Root node: ${pathBuilderResult.nodes[0].name}`);
                console.log(`  - Target node: ${pathBuilderResult.nodes[pathBuilderResult.nodes.length - 1].name}`);
                
                // Проверяем, совпадает ли последний узел в пути с искомой гаплогруппой
                if (pathBuilderResult.nodes[pathBuilderResult.nodes.length - 1].name !== haplo.name) {
                    console.log(`  - WARNING: Path ends with ${pathBuilderResult.nodes[pathBuilderResult.nodes.length - 1].name}, expected ${haplo.name}`);
                }
            }
        } else {
            console.log(`  - ERROR: PathBuilder did not return a path!`);
        }
        
        // 3. Получение пути с использованием стандартного метода (для сравнения)
        console.log(`\n3. Getting path using standard method...`);
        const details = tree.getHaplogroupDetails(haplo.haplogroupId);
        
        if (details && details.path) {
            console.log(`  - Path length: ${details.path.nodes.length} nodes`);
            console.log(`  - Path: ${details.path.string}`);
            
            // Проверка начала и конца пути
            if (details.path.nodes.length > 0) {
                console.log(`  - Root node: ${details.path.nodes[0].name}`);
                console.log(`  - Target node: ${details.path.nodes[details.path.nodes.length - 1].name}`);
                
                // Проверяем, совпадает ли последний узел в пути с искомой гаплогруппой
                if (details.path.nodes[details.path.nodes.length - 1].name !== haplo.name) {
                    console.log(`  - WARNING: Path ends with ${details.path.nodes[details.path.nodes.length - 1].name}, expected ${haplo.name}`);
                }
            }
        } else {
            console.log(`  - ERROR: Standard method did not return a path!`);
        }
        
        // 4. Сравнение путей
        console.log(`\n4. Comparing paths...`);
        
        if (pathBuilderResult && details?.path) {
            const pathBuilderLength = pathBuilderResult.nodes.length;
            const standardPathLength = details.path.nodes.length;
            
            console.log(`  - PathBuilder path length: ${pathBuilderLength}`);
            console.log(`  - Standard path length: ${standardPathLength}`);
            
            if (pathBuilderLength !== standardPathLength) {
                console.log(`  - Path lengths differ by ${Math.abs(pathBuilderLength - standardPathLength)} nodes`);
                console.log(`  - Longer path: ${pathBuilderLength > standardPathLength ? 'PathBuilder' : 'Standard'}`);
            } else {
                console.log(`  - Path lengths are the same: ${pathBuilderLength} nodes`);
            }
            
            // Сравнение узлов
            const pbNodes = pathBuilderResult.nodes.map(n => n.name);
            const stdNodes = details.path.nodes.map(n => n.name);
            
            // Поиск различий
            const uniqueToPB = pbNodes.filter(n => !stdNodes.includes(n));
            const uniqueToStd = stdNodes.filter(n => !pbNodes.includes(n));
            
            if (uniqueToPB.length > 0) {
                console.log(`  - Nodes unique to PathBuilder path: ${uniqueToPB.join(', ')}`);
            }
            
            if (uniqueToStd.length > 0) {
                console.log(`  - Nodes unique to Standard path: ${uniqueToStd.join(', ')}`);
            }
            
            if (uniqueToPB.length === 0 && uniqueToStd.length === 0) {
                console.log(`  - Paths contain the same nodes`);
            }
        } else {
            console.log(`  - Cannot compare paths: one or both methods failed to return a path`);
        }
        
        // 5. Валидация пути
        console.log(`\n5. Validating path...`);
        const validation = tree.validateHaplogroupPath(haplogroupName);
        
        console.log(`  - Validation status: ${validation.status}`);
        console.log(`  - Validation message: ${validation.message}`);
        console.log(`  - Path continuous: ${validation.pathDetails?.isPathContinuous}`);
        
        if (validation.pathDetails?.orderIssues) {
            console.log(`  - Order issues found: ${validation.pathDetails.orderIssues.length}`);
            validation.pathDetails.orderIssues.forEach((issue, idx) => {
                console.log(`    Issue ${idx + 1}: ${issue.issue}`);
            });
        } else {
            console.log(`  - No order issues found`);
        }
    }
    
    // Специальное тестирование для имитации метода searchHaplogroup из HaplogroupService
    console.log('\n\n=== TESTING HAPLOGROUP SERVICE INTEGRATION ===');
    
    async function simulateHaplogroupServiceSearch(term) {
        console.log(`\nSearching for: ${term}`);
        
        const result = {
            ftdna: null
        };

        const ftdnaNode = tree.findHaplogroup(term);
        if (ftdnaNode) {
            console.log(`Found FTDNA node: ${ftdnaNode.name} (${ftdnaNode.haplogroupId})`);
            
            // Используем PathBuilder для получения пути
            const path = pathBuilder.buildPath(ftdnaNode.haplogroupId);
            
            if (path) {
                console.log(`Path built using PathBuilder: ${path.string}`);
                
                // Получаем детали через стандартный метод
                const details = tree.getHaplogroupDetails(ftdnaNode.haplogroupId);
                
                result.ftdna = {
                    path: path,
                    url: `https://discover.familytreedna.com/y-dna/${term}/tree`,
                    statistics: details?.statistics,
                    treeData: tree.getSubtree(ftdnaNode.haplogroupId)
                };
                
                console.log(`Result path: ${result.ftdna.path.string}`);
            } else {
                console.log(`Warning: PathBuilder did not return a path, falling back to standard method`);
                const details = tree.getHaplogroupDetails(ftdnaNode.haplogroupId);
                if (details?.path) {
                    result.ftdna = {
                        path: details.path,
                        url: `https://discover.familytreedna.com/y-dna/${term}/tree`,
                        statistics: details.statistics,
                        treeData: tree.getSubtree(ftdnaNode.haplogroupId)
                    };
                    
                    console.log(`Result path: ${result.ftdna.path.string}`);
                } else {
                    console.log(`Warning: No path found for node ${ftdnaNode.name}`);
                }
            }
        } else {
            console.log(`No FTDNA node found for term ${term}`);
        }

        return result;
    }
    
    // Тестируем главный проблемный случай - R-Y6
    (async () => {
        console.log('\nTesting HaplogroupService for R-Y6...');
        const result = await simulateHaplogroupServiceSearch('R-Y6');
        
        if (result.ftdna && result.ftdna.path) {
            console.log(`\nFinal path for R-Y6 from HaplogroupService:`);
            console.log(result.ftdna.path.string);
            
            // Проверяем, содержит ли путь ожидаемые узлы
            const expectedNodes = ['R-Y4', 'R-Y28', 'R-L657', 'R-M605', 'R-Y27', 'R-Y2', 'R-Y3', 'R-Z94', 'R-Z93'];
            const resultNodes = result.ftdna.path.nodes.map(n => n.name);
            
            const missingNodes = expectedNodes.filter(n => !resultNodes.includes(n));
            
            if (missingNodes.length > 0) {
                console.log(`\nWARNING: Expected nodes missing from path: ${missingNodes.join(', ')}`);
            } else {
                console.log(`\nAll expected nodes are present in the path!`);
                
                // Проверяем порядок узлов
                const nodePositions = {};
                resultNodes.forEach((node, idx) => {
                    nodePositions[node] = idx;
                });
                
                let correctOrder = true;
                for (let i = 0; i < expectedNodes.length - 1; i++) {
                    const current = expectedNodes[i];
                    const next = expectedNodes[i + 1];
                    
                    if (nodePositions[current] > nodePositions[next]) {
                        console.log(`Order issue: ${current} appears after ${next} in the path`);
                        correctOrder = false;
                    }
                }
                
                if (correctOrder) {
                    console.log(`Node order is correct!`);
                }
            }
        } else {
            console.log(`Failed to get path for R-Y6`);
        }
    })();
    
} catch (err) {
    console.error('Error:', err);
}
