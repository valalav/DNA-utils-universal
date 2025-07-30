const fetch = require('node-fetch');

async function testHaplogroupPath(haplogroup) {
    const API_URL = 'http://185.228.235.149:4000';
    
    try {
        console.log(`\nTesting haplogroup: ${haplogroup}`);
        
        const response = await fetch(`${API_URL}/api/haplogroup-path/${haplogroup}`);
        const data = await response.json();
        
        console.log('\nProduction server response:');
        console.log(JSON.stringify(data, null, 2));

        // Анализируем пути
        if (data.yfull) {
            console.log('\nYFull path analysis:');
            const nodes = data.yfull.path.split(' > ');
            nodes.forEach((node, i) => {
                console.log(`${i + 1}. ${node}`);
            });
        }

        if (data.ftdna) {
            console.log('\nFTDNA path analysis:');
            const nodes = data.ftdna.path.split(' > ');
            nodes.forEach((node, i) => {
                console.log(`${i + 1}. ${node}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Тестируем несколько разных гаплогрупп
const testCases = [
    'J-FT251326',
    'R-Z2961',
    'J-M241'
];

testCases.forEach(haplogroup => {
    testHaplogroupPath(haplogroup);
}); 