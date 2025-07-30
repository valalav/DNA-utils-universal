const fs = require('fs');
const path = require('path');
const { HaploTree } = require('./haplo_functions');

try {
    console.log('Loading FTDNA tree data...');
    const ftdnaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/get.json'), 'utf8'));
    const tree = new HaploTree(ftdnaData);
    
    // Получаем гаплогруппу R-Y6
    const haplo = tree.findHaplogroup('R-Y6');
    if (!haplo) {
        console.log('Haplogroup R-Y6 not found!');
        process.exit(1);
    }
    
    console.log(`Found haplogroup: ${haplo.name} (ID: ${haplo.haplogroupId})`);
    
    // Анализируем исходные данные haplogroup node
    console.log('\n1. ORIGINAL NODE STRUCTURE:');
    console.log(`Parent ID: ${haplo.parentId}`);
    console.log(`Variants: ${JSON.stringify(haplo.variants?.map(v => v.variant))}`);
    
    // Прослеживаем путь вручную
    console.log('\n2. MANUAL PATH TRACING:');
    let current = haplo;
    let manualPath = [];
    
    while (current) {
        manualPath.push({
            id: current.haplogroupId,
            name: current.name,
            variants: current.variants?.map(v => v.variant)
        });
        
        if (!current.parentId) break;
        const parent = tree.haplogroups[current.parentId];
        if (!parent) {
            console.log(`ISSUE: Parent with ID ${current.parentId} not found!`);
            break;
        }
        current = parent;
    }
    
    // Выводим путь в обратном порядке
    console.log('Manual path (from root to R-Y6):');
    manualPath.reverse().forEach((node, index) => {
        console.log(`${index}. ${node.name} (ID: ${node.id})${node.variants ? ' - SNPs: ' + node.variants.join(', ') : ''}`);
    });
    
    // Сравниваем с автоматически построенным путем
    console.log('\n3. AUTOMATIC PATH GENERATION:');
    const details = tree.getHaplogroupDetails(haplo.haplogroupId);
    console.log('Path from getHaplogroupDetails:');
    console.log(`Path string: ${details.path.string}`);
    console.log('Path nodes:');
    details.path.nodes.forEach((node, index) => {
        console.log(`${index}. ${node.name} (ID: ${node.id})${node.variants ? ' - SNPs: ' + node.variants.join(', ') : ''}`);
    });
    
    // Проверяем на отсутствующие узлы в пути
    console.log('\n4. CHECKING FOR MISSING NODES:');
    const expectedPathFromFTDNA = 'Home A0-T A1 A1b BT CT CF F GHIJK HIJK IJK K K2 K2b P P-V1651 P-M1254 P-P337 P-P284 P-P226 R R-Y482 R1 R1a R-M459 R-M735 R-M198 R-M417 R-Z645 R-Z93 R-Z94 R-Y3 R-Y2 R-Y27 R-L657 R-M605 R-Y28 R-Y4 R-Y6'.split(' ');
    
    const actualNodesNames = details.path.nodes.map(n => n.name);
    console.log('Expected path from FTDNA browser:', expectedPathFromFTDNA.join(' > '));
    console.log('Actual path from code:', actualNodesNames.join(' > '));
    
    console.log('\nMissing nodes:');
    let missingNodes = [];
    for (const nodeName of expectedPathFromFTDNA) {
        if (nodeName === 'Home') continue; // Пропускаем корневой узел "Home"
        
        if (!actualNodesNames.includes(nodeName)) {
            missingNodes.push(nodeName);
            console.log(`Missing: ${nodeName}`);
        }
    }
    
    // Проверяем неправильный порядок узлов
    console.log('\n5. CHECKING FOR INCORRECT NODE ORDER:');
    const actualPathArray = actualNodesNames;
    const expectedPathArray = expectedPathFromFTDNA.filter(node => node !== 'Home'); // Исключаем "Home"
    
    console.log('Sequence analysis:');
    let i = 0, j = 0;
    let orderIssues = [];
    
    while (i < expectedPathArray.length && j < actualPathArray.length) {
        if (expectedPathArray[i] === actualPathArray[j]) {
            // Узлы совпадают, все в порядке
            i++;
            j++;
        } else {
            // Несоответствие в последовательности
            const issue = `Expected "${expectedPathArray[i]}" at position ${j}, but found "${actualPathArray[j]}"`;
            orderIssues.push(issue);
            console.log(issue);
            
            // Попробуем найти текущий ожидаемый узел далее в актуальном пути
            const indexInActual = actualPathArray.indexOf(expectedPathArray[i], j);
            if (indexInActual !== -1) {
                console.log(`The expected node "${expectedPathArray[i]}" appears later at position ${indexInActual}`);
                // Не увеличиваем i, так как мы не обработали этот узел
                j++;
            } else {
                // Такого узла нет вообще в актуальном пути
                console.log(`The expected node "${expectedPathArray[i]}" is missing from the actual path`);
                i++;
            }
        }
    }
    
    // Специфическая проверка для R-Y6 и его предков
    console.log('\n6. SPECIFIC ANCESTRY ANALYSIS FOR R-Y6:');
    const expectedAncestors = 'R-Y4 R-Y28 R-M605 R-L657 R-Y27 R-Y2 R-Y3 R-Z94 R-Z93 R-Z645 R-M417 R-M198 R-M735 R-M459'.split(' ');
    
    console.log('Expected ancestors of R-Y6:', expectedAncestors.join(' > '));
    console.log('Looking for nodes:');
    
    for (const ancestor of expectedAncestors) {
        const node = tree.findHaplogroup(ancestor);
        if (node) {
            console.log(`Found ${ancestor} with ID ${node.haplogroupId}`);
            // Проверяем, есть ли правильная связь между узлами
            if (ancestor === 'R-Y4') {
                console.log(`Is R-Y6 (${haplo.haplogroupId}) a child of R-Y4 (${node.haplogroupId})? ${node.children?.includes(haplo.haplogroupId) ? 'Yes' : 'No'}`);
                if (!node.children?.includes(haplo.haplogroupId)) {
                    console.log(`Children of R-Y4: ${node.children?.join(', ')}`);
                }
            }
        } else {
            console.log(`Node ${ancestor} not found in the tree!`);
        }
    }
    
    // Проверка правильности расположения R-Y6 в дереве
    console.log('\n7. VALIDATE R-Y6 POSITION:');
    const parent = tree.haplogroups[haplo.parentId];
    console.log(`Direct parent of R-Y6 is: ${parent ? parent.name : 'Unknown'} (ID: ${haplo.parentId})`);
    
    if (parent) {
        console.log(`Parent's children:`, parent.children);
        console.log(`Is R-Y6 (${haplo.haplogroupId}) correctly listed as a child? ${parent.children?.includes(haplo.haplogroupId) ? 'Yes' : 'No'}`);
    }
    
    // Проверка пути в исходной функции getHaplogroupPath
    console.log('\n8. DEBUGGING getHaplogroupPath FUNCTION:');
    // Имитируем логику функции getHaplogroupPath из HaploTree
    const simulatePath = (nodeId) => {
        const path = [];
        let current = tree.haplogroups[nodeId];
        
        while (current) {
            // Логируем каждый шаг построения пути
            console.log(`Processing node: ${current.name} (ID: ${current.haplogroupId}, Parent: ${current.parentId})`);
            
            const snps = current.variants?.map(v => v.variant || v.snp).filter(Boolean) || [];
            const mainSnp = snps[0] || '';
            path.push({
                id: current.haplogroupId,
                name: current.name,
                variants: snps,
                displayName: `${current.name}-${mainSnp}`
            });
            
            if (!current.parentId) {
                console.log('Reached root node, stopping');
                break;
            }
            
            const parentNode = tree.haplogroups[current.parentId];
            if (!parentNode) {
                console.log(`ERROR: Parent with ID ${current.parentId} not found in the tree!`);
                break;
            }
            
            current = parentNode;
        }
        
        return path.reverse();
    };
    
    // Симулируем построение пути
    console.log('Simulating path construction:');
    const simulatedPath = simulatePath(haplo.haplogroupId);
    console.log(`Simulated path length: ${simulatedPath.length} nodes`);
} catch (err) {
    console.error('Error:', err);
}