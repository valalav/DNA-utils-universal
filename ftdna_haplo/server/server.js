const path = require('path');
// Переменные окружения теперь управляются исключительно через PM2 (ecosystem.config.js)
// require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { HaploTree } = require('../haplo_functions');
const { YFullAdapter } = require('../yfull_adapter');
const { SearchIntegrator } = require('../search_integration');
const HaplogroupService = require('./services/haplogroup-service');

const app = express();
const PORT = process.env.PORT;
const API_PATH = process.env.API_PATH || '/api';

// Define base directory for the application
const APP_ROOT = path.join(__dirname, '..'); // This will be the ftdna_haplo directory

// Initialize services
let haplogroupService = null;

try {
    console.log('\nLoading trees...');
    console.log('Application root directory:', APP_ROOT);

    const dataDir = path.join(APP_ROOT, 'data');
    if (!fs.existsSync(dataDir)) {
        throw new Error(`Data directory not found: ${dataDir}. Please ensure the 'data' directory with 'get.json' and 'ytree.json' exists.`);
    }
    
    const ftdnaPath = path.join(dataDir, 'get.json');
    const yfullPath = path.join(dataDir, 'ytree.json');
    
    console.log('Loading FTDNA data from:', ftdnaPath);
    console.log('Loading YFull data from:', yfullPath);
    
    // Проверяем существование файлов
    if (!fs.existsSync(ftdnaPath)) {
        throw new Error(`FTDNA data file not found: ${ftdnaPath}`);
    }
    if (!fs.existsSync(yfullPath)) {
        throw new Error(`YFull data file not found: ${yfullPath}`);
    }
    
    const ftdnaData = JSON.parse(fs.readFileSync(ftdnaPath, 'utf8'));
    const yfullData = JSON.parse(fs.readFileSync(yfullPath, 'utf8'));
    
    console.log('Data files loaded, initializing services...');
    
    const ftdnaTree = new HaploTree(ftdnaData);
    const yfullTree = new YFullAdapter(yfullData);
    const searchIntegrator = new SearchIntegrator(ftdnaTree, yfullTree);
    
    haplogroupService = new HaplogroupService(ftdnaTree, yfullTree, searchIntegrator);
    console.log('✅ Trees loaded successfully');
} catch (error) {
    console.error('❌ Error loading trees:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Не завершаем процесс, а создаем заглушку сервиса
    console.log('⚠️  Starting server without haplogroup service...');
    haplogroupService = null;
}

// CORS setup
const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        // В режиме разработки, разрешаем любой источник для максимальной гибкости.
        if (!isProduction) {
            console.log(`CORS: Allowing development request from origin: ${origin}`);
            return callback(null, true);
        }

        // В продакшене, используем умную логику для универсальности
        if (!origin) {
            // Запросы без origin (например, с того же домена) всегда разрешены
            return callback(null, true);
        }

        // Парсим origin для проверки
        try {
            const originUrl = new URL(origin);
            
            // Разрешаем запросы на порт 9002 с любого IP
            if (originUrl.port === '9002') {
                console.log(`CORS: Allowing request from str-matcher on ${originUrl.hostname}:9002`);
                return callback(null, true);
            }
            
            // Дополнительно проверяем список разрешенных origins из переменной окружения
            const allowedOriginsStr = process.env.ALLOWED_ORIGINS || '';
            const allowedOrigins = allowedOriginsStr.split(',').filter(Boolean);
            
            if (allowedOrigins.includes(origin)) {
                console.log(`CORS: Allowing request from explicitly allowed origin: ${origin}`);
                return callback(null, true);
            }
            
            // Блокируем все остальные запросы
            console.warn(`CORS: Blocking request from disallowed origin: ${origin}`);
            return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
            
        } catch (error) {
            console.error(`CORS: Invalid origin format: ${origin}`);
            return callback(new Error(`CORS policy does not allow access from invalid origin: ${origin}`));
        }
    }
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve API routes
const apiRouter = express.Router();

// All API routes will be prefixed with API_PATH
apiRouter.get(`/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.get(`/search/:haplogroup`, async (req, res) => {
    try {
        if (!haplogroupService) {
            return res.status(503).json({
                error: 'Haplogroup service not available',
                details: 'Service failed to initialize'
            });
        }
        
        const result = await haplogroupService.searchHaplogroup(req.params.haplogroup);
        
        console.log('Search result:', {
            haplogroup: req.params.haplogroup,
            hasData: !!result,
            hasFtdna: !!result?.ftdna,
            hasYfull: !!result?.yfull
        });
        
        if (!result || (!result.ftdna && !result.yfull)) {
            return res.status(404).json({
                error: `Haplogroup ${req.params.haplogroup} not found`,
                details: 'No data available in FTDNA or YFull databases'
            });
        }

        res.json({
            name: req.params.haplogroup,
            ftdnaDetails: result.ftdna,
            yfullDetails: result.yfull
        });
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

apiRouter.get(`/haplogroup-path/:haplogroup`, async (req, res) => {
    try {
        if (!haplogroupService) {
            return res.status(503).json({
                error: 'Haplogroup service not available',
                details: 'Service failed to initialize'
            });
        }
        
        const result = await haplogroupService.searchHaplogroup(req.params.haplogroup);
        
        console.log('Search result:', {
            haplogroup: req.params.haplogroup,
            hasData: !!result,
            hasFtdna: !!result?.ftdna,
            hasYfull: !!result?.yfull
        });
        
        if (!result || (!result.ftdna && !result.yfull)) {
            return res.status(404).json({
                error: `Haplogroup ${req.params.haplogroup} not found`,
                details: 'No data available in FTDNA or YFull databases'
            });
        }

        res.json({
            name: req.params.haplogroup,
            ftdnaDetails: result.ftdna,
            yfullDetails: result.yfull
        });
    } catch (error) {
        console.error('Error in haplogroup-path:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

apiRouter.post(`/check-subclade`, async (req, res) => {
    console.log('🔍 check-subclade endpoint called');
    
    try {
        const { haplogroup, parentHaplogroup } = req.body;
        console.log('Request body:', { haplogroup, parentHaplogroup });
        
        if (!haplogroup || !parentHaplogroup) {
            console.log('❌ Missing parameters');
            return res.json({ isSubclade: false });
        }
        
        if (!haplogroupService) {
            console.log('⚠️ Haplogroup service not available, using fallback logic');
            
            // Простая логика: если строки одинаковые или haplogroup начинается с parentHaplogroup
            const isSubclade = haplogroup === parentHaplogroup || haplogroup.startsWith(parentHaplogroup);
            console.log(`✅ Fallback check: "${haplogroup}" vs "${parentHaplogroup}" = ${isSubclade}`);
            
            return res.json({ isSubclade });
        }
        
        console.log('🔧 Using haplogroupService.checkSubclade...');
        const isSubcladeResult = await haplogroupService.checkSubclade(
            haplogroup,
            parentHaplogroup
        );
        
        console.log('✅ Service result:', isSubcladeResult);
        res.json({ isSubclade: isSubcladeResult });
    } catch (error) {
        console.error('❌ Error in check-subclade:', error);
        console.error('Stack trace:', error.stack);
        
        // Fallback на простую логику
        const { haplogroup, parentHaplogroup } = req.body;
        const isSubclade = haplogroup === parentHaplogroup || (haplogroup && parentHaplogroup && haplogroup.startsWith(parentHaplogroup));
        console.log(`🚨 Error fallback: "${haplogroup}" vs "${parentHaplogroup}" = ${isSubclade}`);
        
        res.json({ isSubclade });
    }
});

// Batch API для проверки множественных субкладов
apiRouter.post(`/batch-check-subclades`, async (req, res) => {
    console.log('🔍 batch-check-subclades endpoint called');
    
    try {
        const { haplogroups, parentHaplogroups } = req.body;
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        if (!Array.isArray(haplogroups) || !Array.isArray(parentHaplogroups)) {
            console.log('❌ Invalid request format');
            return res.status(400).json({
                error: 'haplogroups and parentHaplogroups must be arrays'
            });
        }

        console.log(`🚀 Batch checking ${haplogroups.length} haplogroups against ${parentHaplogroups.length} parents`);

        const results = {};
        
        // Use haplogroupService if available, otherwise fallback
        if (!haplogroupService) { // Use fallback only if service not available
            console.log('⚠️ Using fallback logic for batch (haplogroupService disabled due to issues)');
            
            // Fallback логика для batch
            for (const haplogroup of haplogroups) {
                let isMatch = false;
                
                for (const parentHaplogroup of parentHaplogroups) {
                    if (haplogroup === parentHaplogroup || (haplogroup && haplogroup.startsWith(parentHaplogroup))) {
                        isMatch = true;
                        break;
                    }
                }
                
                results[haplogroup] = isMatch;
            }
        } else {
            console.log('🔧 Using haplogroupService for batch...');
            
            // Проверяем каждую гаплогруппу против всех родительских
            for (const haplogroup of haplogroups) {
                let isMatch = false;
                
                for (const parentHaplogroup of parentHaplogroups) {
                    try {
                        const isSubcladeResult = await haplogroupService.checkSubclade(
                            haplogroup,
                            parentHaplogroup
                        );
                        
                        if (isSubcladeResult) {
                            isMatch = true;
                            break; // Если найдено совпадение, не нужно проверять остальные
                        }
                    } catch (error) {
                        console.error(`Error checking ${haplogroup} vs ${parentHaplogroup}:`, error.message);
                        // При ошибке используем fallback, но не прерываем цикл
                        if (haplogroup === parentHaplogroup || (haplogroup && parentHaplogroup && haplogroup.startsWith(parentHaplogroup))) {
                            isMatch = true;
                            break;
                        }
                    }
                }
                
                results[haplogroup] = isMatch;
            }
        }

        console.log(`✅ Batch check completed: ${Object.values(results).filter(Boolean).length}/${haplogroups.length} matches`);
        
        res.json({ results });
    } catch (error) {
        console.error('❌ Error in batch-check-subclades:', error);
        console.error('Stack trace:', error.stack);
        
        // Полный fallback
        const { haplogroups, parentHaplogroups } = req.body;
        const results = {};
        
        if (Array.isArray(haplogroups) && Array.isArray(parentHaplogroups)) {
            for (const haplogroup of haplogroups) {
                let isMatch = false;
                
                for (const parentHaplogroup of parentHaplogroups) {
                    if (haplogroup === parentHaplogroup || (haplogroup && haplogroup.startsWith(parentHaplogroup))) {
                        isMatch = true;
                        break;
                    }
                }
                
                results[haplogroup] = isMatch;
            }
        }
        
        console.log(`🚨 Error fallback batch completed: ${Object.values(results).filter(Boolean).length}/${haplogroups?.length || 0} matches`);
        res.json({ results });
    }
});

apiRouter.get(`/autocomplete`, async (req, res) => {
    const term = req.query.term;
    if (!term || term.length < 2) {
        return res.json([]);
    }

    try {
        if (!haplogroupService) {
            return res.status(503).json({
                error: 'Haplogroup service not available',
                details: 'Service failed to initialize'
            });
        }
        
        const ftdnaResults = haplogroupService.ftdnaTree.searchWithAutocomplete(term);
        const yfullResults = haplogroupService.yfullTree.searchWithAutocomplete(term);

        const results = [];
        const seen = new Set();

        // Обрабатываем результаты FTDNA
        for (const result of ftdnaResults) {
            const key = `${result.value}-ftdna`;
            if (!seen.has(key)) {
                seen.add(key);
                results.push({
                    ...result,
                    sources: ['ftdna']
                });
            }
        }

        // Объединяем с результатами YFull
        for (const result of yfullResults) {
            const existingIndex = results.findIndex(r => r.value === result.value);
            if (existingIndex >= 0) {
                results[existingIndex].sources.push('yfull');
            } else {
                results.push({
                    ...result,
                    sources: ['yfull']
                });
            }
        }

        res.json(results.slice(0, parseInt(req.query.limit) || 10));
    } catch (error) {
        console.error('Error in autocomplete:', error);
        res.status(500).json({ error: error.message });
    }
});

apiRouter.get(`/subclades/:haplogroup`, async (req, res) => {
    try {
        if (!haplogroupService) {
            return res.status(503).json({
                error: 'Haplogroup service not available',
                details: 'Service failed to initialize'
            });
        }
        
        const subclades = await haplogroupService.getAllSubclades(req.params.haplogroup);
        
        if (!subclades || subclades.length === 0) {
            return res.status(404).json({
                error: `No subclades found for ${req.params.haplogroup}`,
                details: 'The specified haplogroup might not exist or has no children.'
            });
        }

        res.json({
            parent: req.params.haplogroup,
            subclades: subclades
        });
    } catch (error) {
        console.error('Error in subclades endpoint:', error);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.use(API_PATH, apiRouter);

// Serve static files from the React app
const clientBuildPath = path.join(APP_ROOT, 'client', 'dist');
app.use(express.static(clientBuildPath));

// The "catchall" handler: for any request that doesn't match one above,
// send back React's index.html file.
app.get('*', (req, res) => {
    // Ensure the path exists to avoid errors
    const indexPath = path.join(clientBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Client application not found. Please run a client build.');
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Serving API at ${API_PATH}`);
    console.log(`Serving client from ${clientBuildPath}`);
});