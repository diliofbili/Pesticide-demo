const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to handle JSON requests
app.use(express.json());

// Rate limiting to prevent abuse
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Google Sheets API configuration
const SPREADSHEET_ID = '19emAWfw4K7EmKceauFVq7zzpOXsNV03iCneadthpnLs';

async function getAuthenticatedSheets() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const jwtClient = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );
        await jwtClient.authorize();
        return google.sheets({ version: 'v4', auth: jwtClient });
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

// Route middleware for BMI calculations
app.get('/api/bmi', (req, res) => {
    try {
        const { weight, height } = req.query;
        if (!weight || !height) {
            return res.status(400).json({ error: 'Please provide both weight and height' });
        }
        const bmi = parseFloat(weight) / (parseFloat(height) / 100).pow(2);
        res.json({ bmi, category: getCategory(bmi) });
    } catch (error) {
        console.error('BMI calculation error:', error);
        res.status(500).json({ error: 'Error calculating BMI' });
    }
});

// BMI category helper function
function getCategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi >= 18.5 && bmi < 25) return 'Normal weight';
    if (bmi >= 25 && bmi < 30) return 'Overweight';
    return 'Obese';
}

// Route prefix for pest control data
app.get('/api/pesticides', async (req, res) => {
    try {
        const sheets = await getAuthenticatedSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Pesticides!A2:D'
        });
        const rows = response.data.values || [];
        const pesticideData = rows.map(row => ({
            name: row[0] || '',
            price: row[1] ? parseInt(row[1]) : 0,
            saltComposition: row[2] || '',
            company: row[3] || ''
        }));
        res.json(pesticideData);
    } catch (error) {
        console.error('Error fetching pesticide data:', error);
        res.status(500).json({ error: 'Failed to fetch pesticide data' });
    }
});

// Route for nutrition information
app.get('/api/nutrition', async (req, res) => {
    try {
        const sheets = await getAuthenticatedSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Nutrition!A1:B'
        });
        const rows = response.data.values || [];
        const nutritionData = rows.map(row => ({
            name: row[0] || '',
            description: row[1] || ''
        }));
        res.json(nutritionData);
    } catch (error) {
        console.error('Error fetching nutrition data:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition data' });
    }
});

// Route serving BMI calculator
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
