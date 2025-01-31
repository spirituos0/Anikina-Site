const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize the application
const server = express();
const SERVER_PORT = process.env.PORT || 3000;

// Middleware for enabling CORS
server.use(cors());

// Configure database connection
const database = mysql.createConnection({
    host: process.env.DB_HOST, 
    port: process.env.DB_PORT || 3306, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME
});

// Establish connection to the database
database.connect((error) => {
    if (error) {
        console.error('Failed to connect to the database:', error.message);
    } else {
        console.log('Database connection established successfully.');
    }
});

// Default route to verify server is running
server.get('/', (req, res) => {
    res.send('The server is operational!');
});

// Start the server
server.listen(SERVER_PORT, () => {
    console.log(`Server is running at :${SERVER_PORT}`);
});

// Retrieve the list of regions
server.get('/regions', (req, res) => {
    const query = 'SELECT DISTINCT stop_area FROM stops WHERE stop_area IS NOT NULL';

    database.query(query, (error, results) => {
        if (error) {
            console.error('Error retrieving regions:', error.message);
            res.status(500).send('Internal server error');
        } else {
            res.json(results.map((item) => item.stop_area));
        }
    });
});

// Fetch stops within a specific region
server.get('/stops', (req, res) => {
    const selectedRegion = req.query.region;

    if (!selectedRegion) {
        console.error('Region not specified');
        return res.status(400).send('Region must be specified');
    }

    const query = 'SELECT DISTINCT stop_name FROM stops WHERE stop_area = ?';

    database.query(query, [selectedRegion], (error, results) => {
        if (error) {
            console.error('Error fetching stops:', error.message);
            res.status(500).send('Internal server error');
        } else {
            res.json(results.map((item) => item.stop_name));
        }
    });
});

// Retrieve buses available at a specific stop
server.get('/buses', (req, res) => {
    const stop = req.query.stop;
    const region = req.query.region;

    if (!stop || !region) {
        console.error('Stop or region missing in the request');
        return res.status(400).send('Both stop and region are required');
    }

    const query = `
        SELECT DISTINCT r.route_short_name AS bus_number
        FROM routes r
        JOIN trips t ON r.route_id = t.route_id
        WHERE t.trip_id IN (
            SELECT DISTINCT st.trip_id
            FROM stop_times st
            JOIN stops s ON st.stop_id = s.stop_id
            WHERE s.stop_name = ? AND s.stop_area = ?
        )
        ORDER BY LENGTH(r.route_short_name), r.route_short_name;
    `;

    database.query(query, [stop, region], (error, results) => {
        if (error) {
            console.error('Error retrieving buses:', error.message);
            res.status(500).send('Internal server error');
        } else {
            res.json(results.map((item) => item.bus_number));
        }
    });
});

// Identify the nearest stop based on coordinates
server.get('/nearest', (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).send('Latitude and longitude must be specified');
    }

    const query = `
        SELECT stop_name, stop_area, 
               (6371 * acos(
                    cos(radians(?)) * cos(radians(stop_lat)) *
                    cos(radians(stop_lon) - radians(?)) +
                    sin(radians(?)) * sin(radians(stop_lat))
               )) AS distance
        FROM stops
        ORDER BY distance ASC
        LIMIT 1
    `;

    database.query(query, [lat, lon, lat], (error, results) => {
        if (error) {
            console.error('Error finding nearest stop:', error.message);
            res.status(500).send('Internal server error');
        } else if (results.length > 0) {
            res.json({
                stop: results[0].stop_name,
                region: results[0].stop_area,
            });
        } else {
            res.status(404).send('No nearby stop found');
        }
    });
});

// Retrieve detailed bus information
server.get('/bus-details', (req, res) => {
    const { bus, stop } = req.query;

    if (!bus || !stop) {
        return res.status(400).send('Bus and stop parameters are required');
    }

    const query = `
        SELECT DISTINCT st.arrival_time, t.trip_long_name
        FROM stop_times st
        JOIN trips t ON st.trip_id = t.trip_id
        JOIN routes r ON t.route_id = r.route_id
        WHERE r.route_short_name = ? AND st.stop_id IN (
            SELECT stop_id FROM stops WHERE stop_name = ?
        )
        ORDER BY st.arrival_time ASC
        LIMIT 6
    `;

    database.query(query, [bus, stop], (error, results) => {
        if (error) {
            console.error('Error retrieving bus details:', error.message);
            res.status(500).send('Internal server error');
        } else if (results.length === 0) {
            res.status(404).send('No details available for the specified bus and stop');
        } else {
            res.json(results);
        }
    });
});
