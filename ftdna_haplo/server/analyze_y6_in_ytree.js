/**
 * Скрипт для анализа коротких SNP-маркеров в файле ytree.json
 * с фокусом на гаплогруппу R-Y6 и другие короткие SNP
 */

const fs = require('fs');
const path = require('path');

try {
    console.log('Loading YFull tree data...');
    const yfullData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ytree.json'), 'utf8'));
    
    console.log('\nSearching for short SNP markers (like R-Y6, R-Y4, R-Y2) in YFull data...');
    // Функция для поиска узла по имени или SNP в дереве YFull
    function findNodeByNameOrSnp(tree, nameOrSnp) {
        const matches = [];
        
        function search(node, ancestors = []) {
            if (node.name && (
                node.name === nameOrSnp || 
                node.name.includes(nameOrSnp)
            )) {
                matches.push({
                    node,
                    ancestors: [...ancestors, node]
                });
            }
            
            // Проверка SNP
            if (node.snps && node.snps.includes(nameOrSnp)) {
                matches.push({
                    node,
                    ancestors: [...ancestors, node]
                });
            }
            
            // Рекурсивный поиск в дочерних узлах
            if (node.children) {
                for (const child of node.children) {
                    search(child, [...ancestors, node]);
                }
            }
        }
        
        // Начинаем поиск с корня дерева
        search(tree);
        
        return matches;
    }
    
    // Анализ коротких SNP-маркеров
    const shortSnps = ['Y6', 'Y4', 'Y2', 'Y3', 'Z2'];
    const shortSnpResults = {};
    
    // Анализ каждого короткого SNP-маркера
    for (const snp of shortSnps) {
        console.log(`\nAnalyzing short SNP marker: ${snp}`);
        const matches = findNodeByNameOrSnp(yfullData, snp);
        shortSnpResults[snp] = matches;
        console.log(`Found ${matches.length} matches for ${snp}`);
        
        // Анализ потенциальных ложных совпадений
        const falsePositives = matches.filter(match => {
            // Проверка на ложные совпадения по имени
            if (match.node.name && match.node.name.includes(snp) && 
                !match.node.name.endsWith(snp) && 
                !match.node.name.includes(`-${snp}`) && 
                !match.node.name.includes(`${snp}/`)) {
                return true;
            }
            
            // Проверка на ложные совпадения в SNP
            if (match.node.snps) {
                const snpParts = match.node.snps.split(/\s+/);
                const exactMatch = snpParts.some(part => part === snp);
                const partialMatch = snpParts.some(part => part.includes(snp) && part !== snp);
                
                if (partialMatch && !exactMatch) {
                    return true;
                }
            }
            
            return false;
        });
        
        console.log(`Found ${falsePositives.length} potential false positives for ${snp}`);
        if (falsePositives.length > 0) {
            console.log("Examples of false positives:");
            falsePositives.slice(0, 3).forEach(match => {
                console.log(`  - Name: ${match.node.name}, SNPs: ${match.node.snps || 'None'}`);
            });
        }
        
        // Детальный анализ первых 3 совпадений
        const samplesToShow = Math.min(3, matches.length);
        for (let i = 0; i < samplesToShow; i++) {
            const match = matches[i];
    
            console.log(`\nDetailed analysis for ${snp} - Match ${i + 1}:`);
            console.log(`Name: ${match.node.name}`);
            console.log(`SNPs: ${match.node.snps || 'None'}`);
            console.log(`Age: ${match.node.formed || 'Unknown'} - ${match.node.tmrca || 'Unknown'}`);
            
            // Анализ контекста SNP
            if (match.node.snps) {
                const snpParts = match.node.snps.split(/\s+/);
                console.log(`SNP context analysis:`);
                console.log(`- Total SNPs in node: ${snpParts.length}`);
                console.log(`- Position of ${snp} in SNP string: ${match.node.snps.indexOf(snp)}`);
                
                // Проверка точного совпадения
                const exactMatch = snpParts.includes(snp);
                console.log(`- Exact match as individual SNP: ${exactMatch ? 'Yes' : 'No'}`);
                
                // Проверка частичных совпадений
                const partialMatches = snpParts.filter(part => part.includes(snp) && part !== snp);
                if (partialMatches.length > 0) {
                    console.log(`- Found as part of other SNPs: ${partialMatches.join(', ')}`);
                }
            }
            
            // Вывод пути предков
            console.log('\nAncestry path:');
            match.ancestors.forEach((ancestor, i) => {
                console.log(`${i}. ${ancestor.name} ${ancestor.snps ? `(SNPs: ${ancestor.snps})` : ''}`);
            });
        }
    }
    // Загрузка данных FTDNA для сравнительного анализа
    console.log('\nLoading FTDNA tree data...');
    const ftdnaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/get.json'), 'utf8'));
    
    // Функция для поиска гаплогруппы в данных FTDNA
    function findHaplogroupInFtdna(data, name) {
        const results = [];
        
        for (const [id, haplo] of Object.entries(data.allNodes || {})) {
            if (haplo.name === name || 
                haplo.name.includes(name) || 
                (haplo.variants && haplo.variants.some(v => 
                    (v.variant && v.variant.includes(name)) || 
                    (v.snp && v.snp.includes(name))
                ))) {
                results.push({
                    id: id,
                    haplo: haplo
                });
            }
        }
        
        return results;
    }
    
    // Сравнительный анализ коротких SNP в FTDNA и YFull
    console.log('\n\n=== COMPARATIVE ANALYSIS OF SHORT SNPs IN FTDNA AND YFULL ===');
    
    for (const snp of shortSnps) {
        console.log(`\n\nANALYZING SNP ${snp} ACROSS DATABASES:\n${'-'.repeat(50)}`);
        
        // Поиск в FTDNA
        const ftdnaMatches = findHaplogroupInFtdna(ftdnaData, snp);
        const yfullMatches = shortSnpResults[snp];
        
        console.log(`Found ${ftdnaMatches.length} matches in FTDNA and ${yfullMatches.length} matches in YFull`);
        
        // Анализ потенциальных ложных совпадений в FTDNA
        const ftdnaFalsePositives = ftdnaMatches.filter(match => {
            // Проверка на ложные совпадения по имени
            if (match.haplo.name && match.haplo.name.includes(snp) && 
                !match.haplo.name.endsWith(snp) && 
                !match.haplo.name.includes(`-${snp}`) && 
                !match.haplo.name.includes(`${snp}/`)) {
                return true;
            }
            
            // Проверка на ложные совпадения в SNP-маркерах
            if (match.haplo.variants) {
                const partialMatches = match.haplo.variants.filter(v => {
                    const variant = v.variant || v.snp;
                    return variant && variant.includes(snp) && variant !== snp;
                });
                
                const exactMatches = match.haplo.variants.filter(v => {
                    const variant = v.variant || v.snp;
                    return variant === snp;
                });
                
                if (partialMatches.length > 0 && exactMatches.length === 0) {
                    return true;
                }
            }
            
            return false;
        });
        
        console.log(`\nPotential false positives in FTDNA: ${ftdnaFalsePositives.length}`);
        if (ftdnaFalsePositives.length > 0) {
            console.log("Examples:");
            ftdnaFalsePositives.slice(0, 3).forEach(match => {
                console.log(`  - Name: ${match.haplo.name}, Variants: ${JSON.stringify(match.haplo.variants?.map(v => v.variant || v.snp) || [])}`);
            });
        }
        
        // Сравнение SNP между базами данных
        if (yfullMatches.length > 0 && ftdnaMatches.length > 0) {
            // Собираем SNP из YFull
            const yfullSnps = new Set();
            yfullMatches.forEach(match => {
                if (match.node.snps) {
                    match.node.snps.split(/\s+/).forEach(snp => yfullSnps.add(snp));
                }
            });
            
            // Собираем SNP из FTDNA
            const ftdnaSnps = new Set();
            ftdnaMatches.forEach(match => {
                match.haplo.variants?.forEach(v => {
                    if (v.variant) ftdnaSnps.add(v.variant);
                    if (v.snp) ftdnaSnps.add(v.snp);
                });
            });
            
            console.log('\nSNP marker comparison:');
            console.log(`YFull SNPs (up to 10): ${Array.from(yfullSnps).slice(0, 10).join(', ')}${yfullSnps.size > 10 ? '...' : ''}`);
            console.log(`FTDNA SNPs (up to 10): ${Array.from(ftdnaSnps).slice(0, 10).join(', ')}${ftdnaSnps.size > 10 ? '...' : ''}`);
            
            // Проверка общих SNP
            const commonSnps = Array.from(yfullSnps).filter(snp => ftdnaSnps.has(snp));
            console.log(`Common SNPs (up to 10): ${commonSnps.slice(0, 10).join(', ')}${commonSnps.length > 10 ? '...' : ''}`);
            console.log(`Total common SNPs: ${commonSnps.length}`);
        }
        
        // Детальный анализ лучших совпадений
        console.log('\nDetailed comparison of best matches:');
        
        // Лучшие совпадения в FTDNA
        const exactFtdnaMatches = ftdnaMatches.filter(match => match.haplo.name === `R-${snp}` || match.haplo.name === snp);
        if (exactFtdnaMatches.length > 0) {
            const bestFtdnaMatch = exactFtdnaMatches[0];
            console.log(`\nBest FTDNA match:`);
            console.log(`Name: ${bestFtdnaMatch.haplo.name}`);
            console.log(`ID: ${bestFtdnaMatch.id}`);
            console.log(`Parent: ${bestFtdnaMatch.haplo.parentId ? ftdnaData.allNodes[bestFtdnaMatch.haplo.parentId]?.name || 'Unknown' : 'None'}`);
            console.log(`Variants: ${JSON.stringify(bestFtdnaMatch.haplo.variants?.map(v => v.variant || v.snp) || [])}`);
        } else {
            console.log('No exact FTDNA matches found');
        }
        
        // Лучшие совпадения в YFull
        const exactYfullMatches = yfullMatches.filter(match => match.node.name === `R-${snp}` || match.node.name === snp);
        if (exactYfullMatches.length > 0) {
            const bestYfullMatch = exactYfullMatches[0];
            console.log(`\nBest YFull match:`);
            console.log(`Name: ${bestYfullMatch.node.name}`);
            console.log(`SNPs: ${bestYfullMatch.node.snps || 'None'}`);
            if (bestYfullMatch.ancestors.length > 1) {
                const parent = bestYfullMatch.ancestors[bestYfullMatch.ancestors.length - 2];
                console.log(`Parent: ${parent.name}`);
            }
        } else {
            console.log('No exact YFull matches found');
        }
    }
    
    // Заключение и рекомендации
    console.log('\n\n=== ANALYSIS CONCLUSIONS ===');
    console.log('1. Short SNP markers cause problems with exact matching due to partial matches and substring issues');
    console.log('2. There are significant differences in how YFull and FTDNA represent the same haplogroups');
    console.log('3. False positives are common for short markers (2-3 characters)');
    console.log('\nRecommendations:');
    console.log('1. Implement special handling for SNPs shorter than 3 characters');
    console.log('2. Create additional context-aware index for short SNPs');
    console.log('3. Check for word boundaries when matching short SNPs');
    console.log('4. Improve FTDNA-YFull mapping for short SNP markers');
} catch (err) {
    console.error('Error:', err);
}
