const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Google Sheets API setup
const SPREADSHEET_ID = '19emAWfw4K7EmKceauFVq7zzpOXsNV03iCneadthpnLs';
const SHEET_NAME = 'Pesticides';

// Disable caching for API responses
app.get('/api/pesticides', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');

    try {
        // Load credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

        // Create JWT client for authentication
        const jwtClient = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        // Authenticate with Google
        await jwtClient.authorize();

        // Create Sheets API client
        const sheets = google.sheets({ version: 'v4', auth: jwtClient });

        // Fetch data from Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:D`,
        });

        const rows = response.data.values || [];

        // Transform data into structured objects
        const pesticideData = rows.map(row => ({
            name: row[0] || '',
            price: row[1] ? parseInt(row[1]) : 0,
            saltComposition: row[2] || '',
            company: row[3] || ''
        }));

        res.json(pesticideData);

    } catch (error) {
        console.error('Error with Google Sheets API:', error);

        // Fall back to sample data
        res.json([
            { name: "Safhi etc.", price: 0, saltComposition: "Algrip", company: "" },
            { name: "Collin 80 Gm", price: 110, saltComposition: "Pyrazosulfuron", company: "Saffire" },
            { name: "Fighter 80gm", price: 110, saltComposition: "Pyrazosulfuron", company: "Perry" },
            { name: "Ju Mix 8gm", price: 55, saltComposition: "Metasulfuron,Chlorimuron", company: "JU" },
            { name: "Ju Grip 8gm", price: 30, saltComposition: "Metasulfuron / Algrip", company: "JU" }
        ]);
    }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
});
