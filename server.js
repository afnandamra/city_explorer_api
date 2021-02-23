'use strict';

// Application Dependencies
const express = require('express');
//CORS = Cross Origin Resource Sharing
const cors = require('cors');
//DOTENV (read our enviroment variable)
require('dotenv').config();
const superagent = require('superagent');


//Application Setup
const PORT = process.env.PORT || 3030;
const server = express();
server.use(cors());


// Routes Definitions
server.get('/', homeRoute);
server.get('/location', locationRoute);
server.get('/weather', weatherRoute);
server.get('/parks', parksRoute);
server.get('*', notFoundRoute);
server.use(handleErrors);

// Location: https://eu1.locationiq.com/v1/search.php?key=YOUR_ACCESS_TOKEN&q=SEARCH_STRING&format=json
// Weather: https://api.weatherbit.io/v2.0/forecast/daily?city=Raleigh,NC&key=API_KEY
// Parks: https://developer.nps.gov/api/v1/parks?parkCode=acad&api_key=YOUR_KEY

server.get('/test', (req, res) => {
    res.send('your server is working fine!!')
})

function homeRoute(req, res) {
    res.send('home route');
}

function locationRoute(req, res) {
    // const locData = require('./data/location.json');
    const cityName = req.query.city;
    let key = process.env.GEOCODE_API_KEY;
    let url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;
    superagent.get(url)
        .then(locData => {
            const locObj = new Location(cityName, locData.body[0]);
            res.send(locObj);
        })
        .catch(() => {
            handleErrors('Error in getting data from LocationIQ', req, res)
        })
}

function weatherRoute(req, res) {
    // const weathData = require('./data/weather.json');
    let city = req.query.search_query;
    let key = process.env.WEATHER_API_KEY;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${key}`;
    superagent.get(url)
        .then(weathData => {
            let weathArr = weathData.body.data.map(val => new Weather(val));
            res.send(weathArr);
        })
        .catch(() => {
            handleErrors('Error in getting data from LocationIQ', req, res)
        })
}

function parksRoute(req, res) {
    let code = req.query.search_query;
    let key = process.env.PARKS_API_KEY;
    let url = `https://developer.nps.gov/api/v1/parks?q=${code}&limit=5&api_key=${key}`;
    superagent.get(url)
        .then(parkData => {
            let parkArr = parkData.body.data.map(val => new Park(val));
            res.send(parkArr);
        })
        .catch(() => {
            handleErrors('Error in getting data from LocationIQ', req, res)
        })
}

function notFoundRoute(req, res) {
    res.status(404).send('Not found');
}

function handleErrors(error, req, res) {
    const errObj = {
        status: '500',
        responseText: 'Sorry, something went wrong'
    }
    res.status(500).send(errObj);
}

function Location(cityName, locationData) {
    this.search_query = cityName;
    this.formatted_query = locationData.display_name;
    this.latitude = locationData.lat;
    this.longitude = locationData.lon;
}

function Weather(weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = new Date(weatherData.valid_date).toString().slice(0, 15);
}

function Park(parkData) {
    this.name = parkData.name;
    this.address = `"${parkData.addresses[0].line1}" "${parkData.addresses[0].city}" "${parkData.addresses[0].stateCode}" "${parkData.addresses[0].postalCode}"`;
    this.fee = parkData.entranceFees[0].cost || '0.00';
    this.description = parkData.description;
    this.url = parkData.url;
}

server.listen(PORT, () => {
    console.log(`test ${PORT}`);
})