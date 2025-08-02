const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { HaploTree } = require('../haplo_functions');
const { YFullAdapter } = require('../yfull_adapter');
const { SearchIntegrator } = require('../search_integration');
const HaplogroupService = require('./services/haplogroup-service');

const app = express();
const PORT = process.env.PORT || 9003;
const API_PATH = process.env.API_PATH || '/api';

// Initialize services
let haplogroupService = null;

try {
    console.log('\nLoading trees...');
    const ftdnaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/get.json'), 'utf8'));
    const yfullData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ytree.json'), 'utf8'));
    
    const ftdnaTree = new HaploTree(ftdnaData);
    const yfullTree = new YFullAdapter(yfullData);
    const searchIntegrator = new SearchIntegrator(ftdnaTree, yfullTree);
    
    haplogroupService = new HaplogroupService(ftdnaTree, yfullTree, searchIntegrator);
    console.log('Trees loaded successfully');
} catch (error) {
    console.error('Error loading trees:', error);
    process.exit(1);
}

// CORS setup
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:9002', 'http://localhost:5173', 'https://str.aadna.ru:8443'];

// Middleware для обработки CORS
app.use((req, res, next) => {
    const origin = req.header("Origin");
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Access-Control-Allow-Credentials", "true");
    }

    // Если это preflight-запрос (OPTIONS)
    if (req.method === "OPTIONS") {
        return res.status(204).end(); // Успешный ответ без тела
    }

    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get(`${API_PATH}/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get(`${API_PATH}/search/:haplogroup`, async (req, res) => {
    try {
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

app.get(`${API_PATH}/haplogroup-path/:haplogroup`, async (req, res) => {
    try {
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

app.post(`${API_PATH}/check-subclade`, async (req, res) => {
    try {
        const { haplogroup, parentHaplogroup } = req.body;
        console.log('Checking subclade:', { haplogroup, parentHaplogroup });

        const isSubcladeResult = await haplogroupService.checkSubclade(
            haplogroup,
            parentHaplogroup
        );

        res.json({ isSubclade: isSubcladeResult });
    } catch (error) {
        console.error('Error in check-subclade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Batch API для проверки множественных субкладов
app.post(`${API_PATH}/batch-check-subclades`, async (req, res) => {
    try {
        const { haplogroups, parentHaplogroups } = req.body;
        
        if (!Array.isArray(haplogroups) || !Array.isArray(parentHaplogroups)) {
            return res.status(400).json({
                error: 'haplogroups and parentHaplogroups must be arrays'
            });
        }

        console.log(`🚀 Batch checking ${haplogroups.length} haplogroups against ${parentHaplogroups.length} parents`);

        const results = {};
        
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
                    console.error(`Error checking ${haplogroup} vs ${parentHaplogroup}:`, error);
                }
            }
            
            results[haplogroup] = isMatch;
        }

        console.log(`✅ Batch check completed: ${Object.values(results).filter(Boolean).length}/${haplogroups.length} matches`);
        
        res.json({ results });
    } catch (error) {
        console.error('Error in batch-check-subclades:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get(`${API_PATH}/autocomplete`, async (req, res) => {
    const term = req.query.term;
    if (!term || term.length < 2) {
        return res.json([]);
    }

    try {
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at ${API_PATH}`);
});