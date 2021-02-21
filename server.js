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
    const locObj = new Location(locData);
    res.send(locObj);
})

server.get('/weather', (req, res) => {
    const weathData = require('./data/weather.json');
    let weathArr = [];
    weathData.data.forEach(val => {
        const weather = new Weather(val.weather.description, val.valid_date);
        weathArr.push(weather);
    });
    res.send(weathArr);
})

server.use('*', (req, res) => {
    res.status(404).send('route not found')
})

function Location(locationData) {
    this.search_query = locationData[0].display_name.split(',')[0];
    this.formatted_query = locationData[0].display_name;
    this.latitude = locationData[0].lat;
    this.longitude = locationData[0].lon;
}

function Weather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}

server.listen(PORT, () => {
    console.log(`test ${PORT}`);
})