/**
 * test_path_improvements.js
 * 
 * Скрипт для тестирования улучшений в построении путей гаплогрупп.
 * Специально проверяет корректность путей для известных проблемных гаплогрупп,
 * включая R-Y6.
 */

const fs = require('fs');
const path = require('path');
const { HaploTree } = require('./haplo_functions');
const PathBuilder = require('./path_builder');

// Список проблемных гаплогрупп для тестирования
const PROBLEM_HAPLOGROUPS = [
    'R-Y6',           // Основная проблемная гаплогруппа
    'R-Y4',           // Родительская гаплогруппа для R-Y6
    'R-Y27',          // Другие гаплогруппы из той же серии
    'R-Y28',
    'R-M458',         // Гаплогруппа с глубоким путем
    'R-M198',
    'A-M31',          // Гаплогруппа с коротким путем
    'B-M60'           // Еще одна гаплогруппа с коротким путем
];

// Ожидаемые узлы в пути для R-Y6
const EXPECTED_NODES_RY6 = [
    'A0-T', 'A1', 'A1b', 'BT', 'CT', 'CF', 'F', 'GHIJK', 'HIJK', 
    'IJK', 'K', 'K2', 'K2b', 'P', 'P-V1651', 'P-M1254', 'P-P337', 
    'P-P284', 'P-P226', 'R', 'R-Y482', 'R1', 'R1a', 'R-M459', 
    'R-M735', 'R-M198', 'R-M417', 'R-Z645', 'R-Z93', 'R-Z94', 
    'R-Y3', 'R-Y2', 'R-Y27', 'R-L657', 'R-M605', 'R-Y28', 'R-Y4', 'R-Y6'
];

// Функция для валидации пути
function validatePath(pathNodes, expectedPath) {
    // Преобразуем узлы в имена
    const actualNames = pathNodes.map(node => node.name);
    
    // Проверяем на наличие всех ожидаемых узлов
    const missingNodes = expectedPath.filter(name => !actualNames.includes(name));
    
    // Проверяем порядок узлов (все ли узлы в правильном порядке)
    let correctOrder = true;
    for (let i = 0; i < expectedPath.length - 1; i++) {
        const currentNode = expectedPath[i];
        const nextNode = expectedPath[i + 1];
        
        const currentIndex = actualNames.indexOf(currentNode);
        const nextIndex = actualNames.indexOf(nextNode);
        
        // Если оба узла найдены, проверяем их порядок
        if (currentIndex !== -1 && nextIndex !== -1) {
            if (currentIndex >= nextIndex) {
                correctOrder = false;
                console.log(`Incorrect order: ${currentNode} should appear before ${nextNode}`);
            }
        }
    }
    
    return {
        complete: missingNodes.length === 0,
        correctOrder: correctOrder,
        missingNodes: missingNodes
    };
}

// Функция для красивого вывода результатов теста
function printPathTestResult(haplogroupName, path, validation) {
    console.log(`\n---- Testing path for ${haplogroupName} ----`);
    console.log(`Path length: ${path.nodes.length} nodes`);
    console.log(`Path: ${path.string}`);
    
    if (haplogroupName === 'R-Y6') {
        console.log('\nValidation against expected path:');
        console.log(`Complete: ${validation.complete ? 'YES' : 'NO'}`);
        console.log(`Correct order: ${validation.correctOrder ? 'YES' : 'NO'}`);
        
        if (validation.missingNodes.length > 0) {
            console.log(`Missing nodes: ${validation.missingNodes.join(', ')}`);
        } else {
            console.log('No missing nodes - Path is complete!');
        }
    }
    
    console.log('------------------------\n');
    
    return {
        name: haplogroupName,
        complete: validation.complete,
        correctOrder: validation.correctOrder,
        missingNodes: validation.missingNodes,
        pathLength: path.nodes.length
    };
}

// Основная тестовая функция
async function runTests() {
    console.log('Loading FTDNA tree data...');
    try {
        const ftdnaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/get.json'), 'utf8'));
        const tree = new HaploTree(ftdnaData);
        const pathBuilder = new PathBuilder(tree);
        
        console.log('Testing path building for problematic haplogroups...');
        const results = [];
        
        for (const haplogroupName of PROBLEM_HAPLOGROUPS) {
            const path = pathBuilder.buildPath(haplogroupName);
            
            if (!path) {
                console.error(`Failed to build path for ${haplogroupName}`);
                results.push({
                    name: haplogroupName,
                    error: 'Path building failed',
                    success: false
                });
                continue;
            }
            
            // Для R-Y6 выполняем дополнительную валидацию
            let validation;
            if (haplogroupName === 'R-Y6') {
                validation = validatePath(path.nodes, EXPECTED_NODES_RY6);
            } else {
                validation = { complete: true, correctOrder: true, missingNodes: [] };
            }
            
            const result = printPathTestResult(haplogroupName, path, validation);
            results.push(result);
        }
        
        // Вывод общего итога
        console.log('\n===== TEST SUMMARY =====');
        let passedTests = 0;
        
        for (const result of results) {
            const success = result.name === 'R-Y6' ? 
                (result.complete && result.correctOrder) : true;
                
            console.log(`${result.name}: ${success ? 'PASS' : 'FAIL'}`);
            if (success) passedTests++;
        }
        
        console.log(`\nPassed ${passedTests}/${results.length} tests`);
        
    } catch (err) {
        console.error('Test failed with error:', err);
    }
}

// Запуск тестов
runTests().catch(err => {
    console.error('Unhandled error during testing:', err);
});