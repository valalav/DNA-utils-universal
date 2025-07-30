const fs = require('fs');
const path = require('path');
const { HaploTree } = require('./haplo_functions');

try {
    console.log('Loading FTDNA tree data...');
    const ftdnaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/get.json'), 'utf8'));
    const tree = new HaploTree(ftdnaData);
    
    console.log('\nSearching for R-Y6...');
    const haplo = tree.findHaplogroup('R-Y6');
    if (haplo) {
        console.log(`Found haplogroup: ${haplo.name} (ID: ${haplo.haplogroupId})`);
        
        // Выводим все доступные свойства гаплогруппы
        console.log('\nProperties:');
        console.log(JSON.stringify(Object.keys(haplo), null, 2));
        
        // Выводим основную информацию
        console.log('\nBasic Info:');
        const basicInfo = {
            name: haplo.name,
            haplogroupId: haplo.haplogroupId,
            parentId: haplo.parentId,
            variants: haplo.variants?.map(v => v.variant).filter(Boolean),
            kitsCount: haplo.kitsCount,
            subBranches: haplo.subBranches
        };
        console.log(JSON.stringify(basicInfo, null, 2));
        
        console.log('\nFinding parent nodes...');
        let parentChain = [];
        let current = haplo;
        while (current) {
            parentChain.push({
                name: current.name,
                haplogroupId: current.haplogroupId,
                variants: current.variants?.map(v => v.variant).filter(Boolean)
            });
            if (!current.parentId) break;
            current = tree.haplogroups[current.parentId];
        }
        console.log('Parent chain:');
        console.log(JSON.stringify(parentChain.reverse(), null, 2));

        console.log('\nGenerating path from getHaplogroupDetails...');
        const details = tree.getHaplogroupDetails(haplo.haplogroupId);
        console.log(JSON.stringify(details.path, null, 2));
        
        // Поиск всех возможных узлов, связанных с R-Y6
        console.log('\nSearching for all Y6-related nodes...');
        const y6Related = [];
        for (const [id, node] of Object.entries(tree.haplogroups)) {
            if (node.name && (
                node.name.includes('Y6') || 
                (node.variants && node.variants.some(v => 
                    (v.variant && v.variant.includes('Y6')) || 
                    (v.snp && v.snp.includes('Y6'))
                ))
            )) {
                y6Related.push({
                    name: node.name,
                    id: id,
                    variants: node.variants?.map(v => v.variant).filter(Boolean),
                    parentId: node.parentId
                });
            }
        }
        console.log(`Found ${y6Related.length} Y6-related nodes. First 5 nodes:`); 
        console.log(JSON.stringify(y6Related.slice(0, 5), null, 2));
    } else {
        console.log('Haplogroup R-Y6 not found!');
    }
} catch (err) {
    console.error('Error:', err);
}