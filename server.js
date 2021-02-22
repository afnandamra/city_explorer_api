'use strict'

const express = require('express');
require('dotenv').config();

const cors = require('cors');

const server = express();

const PORT = process.env.PORT || 3030;
server.use(cors());

server.get('/test', (req, res) => {
    res.send('your server is working fine!!')
})

server.get('/', (req, res) => {
    res.send('home route');
})

server.get('/location', (req, res) => {
    const locData = require('./data/location.json');
    const locObj = new Location(locData[0]);
    res.send(locObj);
})

server.get('/weather', (req, res) => {
    const weathData = require('./data/weather.json');
    let weathArr = weathData.data.map(val => new Weather(val));
    res.send(weathArr);
})

server.use('*', (req, res) => {
    const errObj = {
        status: '500',
        responseText: "Sorry, something went wrong"
    }
    res.status(500).send(errObj);
})

function Location(locationData) {
    this.search_query = locationData.display_name.split(',')[0];
    this.formatted_query = locationData.display_name;
    this.latitude = locationData.lat;
    this.longitude = locationData.lon;
}

function Weather(weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = weatherData.valid_date;
}

server.listen(PORT, () => {
    console.log(`test ${PORT}`);
})