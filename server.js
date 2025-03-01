const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Google Sheets API setup
const SPREADSHEET_ID = '19emAWfw4K7EmKceauFVq7zzpOXsNV03iCneadthpnLs';
const SHEET_NAME = 'Pesticides';

// Disable caching for API responses
app.get('/api/pesticides', async (req, res) => {
    // Set headers to prevent caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');
    try {
        // Load the service account key
        const keyFile = path.join(__dirname, 'pesticidecalculator-f5e7b4ef098a.json');
        
        console.log('Checking if service account file exists...');
        if (!fs.existsSync(keyFile)) {
            throw new Error('Service account key file not found at: ' + keyFile);
        }
        
        console.log('Reading service account credentials...');
        const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
        
        console.log('Creating JWT client...');
        // Create JWT client for authentication
        const jwtClient = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );
        
        console.log('Authenticating with Google...');
        // Authenticate with Google
        await jwtClient.authorize();
        console.log('Successfully authenticated!');
        
        // Create sheets API client
        console.log('Creating Sheets API client...');
        const sheets = google.sheets({ version: 'v4', auth: jwtClient });
        
        // Get data from the sheet
        console.log(`Fetching data from spreadsheet ID: ${SPREADSHEET_ID}, Sheet: ${SHEET_NAME}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:D`,
        });
        
        console.log('Data received from Google Sheets!');
        const rows = response.data.values || [];
        console.log(`Retrieved ${rows.length} rows of data`);
        
        // Transform data into structured objects
        const pesticideData = rows.map(row => ({
            name: row[0] || '',
            price: row[1] ? parseInt(row[1]) : 0,
            saltComposition: row[2] || '',
            company: row[3] || ''
        }));
        
        console.log('Sending data to client...');
        res.json(pesticideData);
        
    } catch (error) {
        console.error('Error with Google Sheets API:', error);
        
        // Fall back to sample data
        console.log('Falling back to sample data...');
        
        const sampleData = [
            {
                name: "Safhi etc.",
                price: 0,
                saltComposition: "Algrip",
                company: ""
            },
            {
                name: "Collin 80 Gm",
                price: 110,
                saltComposition: "Pyrazosulfuron",
                company: "Saffire"
            },
            {
                name: "Fighter 80gm",
                price: 110,
                saltComposition: "Pyrazosulfuron",
                company: "Perry"
            },
            {
                name: "Ju Mix 8gm",
                price: 55,
                saltComposition: "Metasulfuron,Chlorimuron",
                company: "JU"
            },
            {
                name: "Ju Grip 8gm",
                price: 30,
                saltComposition: "Metasulfuron / Algrip",
                company: "JU"
            }
        ];
        
        // Send sample data with a 200 status code so the app still works
        res.json(sampleData);
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
