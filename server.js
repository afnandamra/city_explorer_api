'use strict';

// Application Dependencies
const express = require('express');
//CORS = Cross Origin Resource Sharing
const cors = require('cors');
//DOTENV (read our enviroment variable)
require('dotenv').config();
// Superagent
const superagent = require('superagent');
// postgresql
const pg = require('pg');


//Application Setup
const PORT = process.env.PORT || 3030;
const server = express();
// const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
// const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL ? true : false });
const client = new pg.Client(process.env.DATABASE_URL) || new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });


server.use(cors());

// Routes Definitions
server.get('/', homeRoute);
server.get('/location', locationRoute);
server.get('/weather', weatherRoute);
server.get('/parks', parksRoute);
server.get('/movies', moviesRoute)
server.get('/yelp', yelpRoute)
server.get('*', notFoundRoute);
server.use(handleErrors);

// Location: https://eu1.locationiq.com/v1/search.php?key=YOUR_ACCESS_TOKEN&q=SEARCH_STRING&format=json
// Weather: https://api.weatherbit.io/v2.0/forecast/daily?city=Raleigh,NC&key=API_KEY
// Parks: https://developer.nps.gov/api/v1/parks?parkCode=acad&api_key=YOUR_KEY
// Movies: https://api.themoviedb.org/3/search/movie?api_key=YOUR_KEY&language=en-US&query=seattle&page=1
// Yelp: https://api.yelp.com/v3/businessses/search?latitude=21.545684&longitude=24.1565165&limit=5&offset=6



server.get('/test', (req, res) => {
    res.send('your server is working fine!!');
})

function homeRoute(req, res) {
    res.send('home route');
}


// Handling location
function locationRoute(req, res) {
    // const locData = require('./data/location.json');
    const cityName = req.query.city;
    let key = process.env.GEOCODE_API_KEY;
    let url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;
    const SQL = `SELECT * FROM locations WHERE search_query = '${cityName}';`;
    client.query(SQL)
        .then(data => {
            // console.log(data);
            if (data.rows.length === 0) {
                superagent.get(url)
                    .then(locData => {
                        const locObj = new Location(cityName, locData.body[0]);
                        // add data to DB
                        const SQLIN = `INSERT INTO locations
                                    (search_query, formatted_query, latitude, longitude)
                                    VALUES ($1,$2,$3,$4) RETURNING *;`;
                        let safeValues = [cityName, locObj.formatted_query, locObj.latitude, locObj.longitude];
                        client.query(SQLIN, safeValues)
                            .then(val => {
                                res.send(val);
                            }).catch(() => {
                                handleErrors('Error logging the dato to the DB', req, res)
                            })
                    })
                    .catch(() => {
                        handleErrors('Error in getting data from LocationIQ', req, res)
                    })
            } else if (data.rows[0].search_query === cityName) {
                // get data from DB
                const DBObj = new Location(data.rows[0].search_query, data.rows[0]); // WTH?
                res.send(DBObj);
            }
        }).catch(() => {
            handleErrors('Error in getting data from DB', req, res)
        })
}


// Handling weather
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
            handleErrors('Error in getting data from WeatherBit', req, res)
        })
}


// Handling parks
function parksRoute(req, res) {
    let code = req.query.search_query;
    let key = process.env.PARKS_API_KEY;
    let url = `https://developer.nps.gov/api/v1/parks?q=${code}&limit=10&api_key=${key}`;
    superagent.get(url)
        .then(parkData => {
            let parkArr = parkData.body.data.map(val => new Park(val));
            res.send(parkArr);
        })
        .catch(() => {
            handleErrors('Error in getting data from NPS', req, res)
        })
}


// Handling movies
function moviesRoute(req, res) {
    let city = req.query.search_query;
    let key = process.env.MOVIE_API_KEY;
    let url = `https://api.themoviedb.org/3/search/multi?api_key=${key}&language=en-US&query=${city}&include_adult=false`;
    superagent.get(url)
        .then(movieData => {
            let movieArr = movieData.body.results.map(val => new Movie(val));
            res.send(movieArr);
        })
        .catch(() => {
            handleErrors('Error in getting data from TheMovieDB', req, res)
        })
}


// Handling Yelp
function yelpRoute(req, res) {
    let key = process.env.YELP_API_KEY;
    let page = req.query.page;
    let numPerPage = 5;
    let start = ((page - 1) * numPerPage + 1);
    let lat = req.query.latitude;
    let lon = req.query.longitude;
    let url = `https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lon}&limit=${numPerPage}&offset=${start}`;
    superagent.get(url)
        .set("Authorization", `Bearer ${key}`)
        .then(yelpData => {
            let yelpArr = yelpData.body.businesses.map(val => new Yelp(val));
            res.send(yelpArr);
        }).catch(() => {
            handleErrors('Error in getting data from Yelp', req, res)
        })
}



// Error handling functions
function notFoundRoute(req, res) {
    res.status(404).send('Not found');
}

function handleErrors(error, req, res) {
    const errObj = {
        status: '500',
        responseText: error
    }
    res.status(500).send(errObj);
}


// Constructors
function Location(cityName, locationData) {
    this.search_query = cityName;
    this.formatted_query = locationData.display_name || locationData.formatted_query;
    this.latitude = locationData.lat || locationData.latitude;
    this.longitude = locationData.lon || locationData.longitude;
}

function Weather(weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = new Date(weatherData.valid_date).toString().slice(0, 15);
}

function Park(parkData) {
    this.name = parkData.fullName;
    this.address = `"${parkData.addresses[0].line1}" "${parkData.addresses[0].city}" "${parkData.addresses[0].stateCode}" "${parkData.addresses[0].postalCode}"`;
    this.fee = parkData.entranceFees[0].cost || '0.00';
    this.description = parkData.description;
    this.url = parkData.url;
}

function Movie(movieData) {
    this.title = movieData.title;
    this.overview = movieData.overview;
    this.average_votes = movieData.vote_average;
    this.total_votes = movieData.vote_count;
    this.image_url = `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
    this.popularity = movieData.popularity;
    this.released_on = movieData.release_date;
}

function Yelp(yelpData) {
    this.name = yelpData.name;
    this.image_url = yelpData.image_url;
    this.price = yelpData.price;
    this.rating = yelpData.rating;
    this.url = yelpData.url;
}


// connecting server and DB
client.connect()
    .then(server.listen(PORT, () => {
        console.log(`test ${PORT}`);
    })
    )