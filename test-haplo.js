const fs = require('fs');
const path = require('path');

console.log('🔍 Testing haplogroup service initialization...');

try {
    // Проверяем пути к файлам
    const ftdnaPath = path.join(__dirname, 'ftdna_haplo', 'data', 'get.json');
    const yfullPath = path.join(__dirname, 'ftdna_haplo', 'data', 'ytree.json');
    
    console.log('📁 Checking file paths...');
    console.log('FTDNA path:', ftdnaPath);
    console.log('YFull path:', yfullPath);
    
    if (!fs.existsSync(ftdnaPath)) {
        throw new Error(`FTDNA data file not found: ${ftdnaPath}`);
    }
    if (!fs.existsSync(yfullPath)) {
        throw new Error(`YFull data file not found: ${yfullPath}`);
    }
    
    console.log('✅ Files exist');
    
    // Загружаем данные
    console.log('📊 Loading JSON data...');
    const ftdnaData = JSON.parse(fs.readFileSync(ftdnaPath, 'utf8'));
    console.log('✅ FTDNA data loaded, nodes:', Object.keys(ftdnaData.allNodes || {}).length);
    
    const yfullData = JSON.parse(fs.readFileSync(yfullPath, 'utf8'));
    console.log('✅ YFull data loaded');
    
    // Инициализируем классы
    console.log('🏗️ Initializing classes...');
    
    const { HaploTree } = require('./ftdna_haplo/haplo_functions');
    console.log('✅ HaploTree class loaded');
    
    const { YFullAdapter } = require('./ftdna_haplo/yfull_adapter');
    console.log('✅ YFullAdapter class loaded');
    
    const { SearchIntegrator } = require('./ftdna_haplo/search_integration');
    console.log('✅ SearchIntegrator class loaded');
    
    const HaplogroupService = require('./ftdna_haplo/server/services/haplogroup-service');
    console.log('✅ HaplogroupService class loaded');
    
    // Создаем экземпляры
    console.log('🔧 Creating instances...');
    
    const ftdnaTree = new HaploTree(ftdnaData);
    console.log('✅ HaploTree instance created');
    
    const yfullTree = new YFullAdapter(yfullData);
    console.log('✅ YFullAdapter instance created');
    
    const searchIntegrator = new SearchIntegrator(ftdnaTree, yfullTree);
    console.log('✅ SearchIntegrator instance created');
    
    const haplogroupService = new HaplogroupService(ftdnaTree, yfullTree, searchIntegrator);
    console.log('✅ HaplogroupService instance created');
    
    // Тестируем метод checkSubclade
    console.log('🧪 Testing checkSubclade method...');
    
    const testResult = haplogroupService.checkSubclade('K', 'K');
    console.log('Test result K vs K:', testResult);
    
    const testResult2 = haplogroupService.checkSubclade('R1a', 'R');
    console.log('Test result R1a vs R:', testResult2);
    
    console.log('🎉 All tests passed!');
    
} catch (error) {
    console.error('❌ Error during initialization:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
