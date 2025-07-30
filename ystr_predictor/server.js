// c:\projects\DNA-utils-universal\ystr_predictor\server.js
const express = require('express');
const cors = require('cors');
const { PredictorService } = require('./services/predictor-service');

const app = express();
app.use(cors());
app.use(express.json());

const predictorService = new PredictorService();

app.post('/api/predict', async (req, res) => {
    try {
        const { markers } = req.body;
        const prediction = await predictorService.predict(markers);
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PREDICTOR_PORT || 4100;
app.listen(PORT, () => {
    console.log(`YSTR Predictor running on port ${PORT}`);
});

// c:\projects\DNA-utils-universal\ystr_predictor\services\predictor-service.js
const axios = require('axios');

class PredictorService {
    constructor() {
        this.ftdnaApiUrl = process.env.FTDNA_API_URL || 'http://localhost:4000/api';
        this.trainingData = new Map();
    }

    async addTrainingData(markers, haplogroup) {
        this.trainingData.set(JSON.stringify(markers), haplogroup);
        
        // Получаем информацию о гаплогруппе из ftdna_haplo
        try {
            const response = await axios.get(`${this.ftdnaApiUrl}/search/${haplogroup}`);
            if (response.data) {
                // Здесь будем хранить иерархию и дополнительную информацию
                this.trainingData.set(`${haplogroup}_details`, response.data);
            }
        } catch (error) {
            console.error(`Error fetching haplogroup details: ${error.message}`);
        }
    }

    async predict(markers) {
        // Базовая версия - просто ищем точное совпадение
        const markersKey = JSON.stringify(markers);
        const prediction = this.trainingData.get(markersKey);
        
        if (!prediction) {
            return {
                success: false,
                message: 'No matching patterns found'
            };
        }

        const details = this.trainingData.get(`${prediction}_details`);
        
        return {
            success: true,
            prediction: prediction,
            confidence: 1.0,
            details: details
        };
    }
}

module.exports = { PredictorService };

// c:\projects\DNA-utils-universal\ystr_predictor\package.json
{
    "name": "ystr-predictor",
    "version": "1.0.0",
    "main": "server.js",
    "dependencies": {
        "axios": "^1.6.7",
        "cors": "^2.8.5",
        "express": "^4.18.2"
    }
}
