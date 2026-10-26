# weather/hourly

- source: https://api.weather.gov/gridpoints/LOT/56,73/forecast/hourly
- status: 200
- bytes: 162453
- fetchedAt: 2026-10-23T20:35:25Z

```json
{
    "@context": [
        "https://geojson.org/geojson-ld/geojson-context.jsonld",
        {
            "@version": "1.1",
            "wx": "https://api.weather.gov/ontology#",
            "geo": "http://www.opengis.net/ont/geosparql#",
            "unit": "http://codes.wmo.int/common/unit/",
            "@vocab": "https://api.weather.gov/ontology#"
        }
    ],
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [
                    -88.188,
                    41.8882
                ],
                [
                    -88.1865,
                    41.9099
                ],
                [
                    -88.2158,
                    41.911
                ],
                [
                    -88.2173,
                    41.8892
                ],
                [
                    -88.188,
                    41.8882
                ]
            ]
        ]
    },
    "properties": {
        "units": "us",
        "forecastGenerator": "HourlyForecastGenerator",
        "generatedAt": "2026-10-23T20:35:25+00:00",
        "updateTime": "2026-10-23T19:51:14+00:00",
        "validTimes": "2026-10-23T13:00:00+00:00/P7DT12H",
        "elevation": {
            "unitCode": "wmoUnit:m",
            "value": 242.0112
        },
        "periods": [
            {
                "number": 1,
                "name": "",
                "startTime": "2026-10-23T15:00:00-05:00",
                "endTime": "2026-10-23T16:00:00-05:00",
                "isDaytime": true,
                "temperature": 73,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 38
                },
                "windSpeed": "5 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/day/skc?size=small",
                "shortForecast": "Sunny",
                "detailedForecast": ""
            },
            {
                "number": 2,
                "name": "",
                "startTime": "2026-10-23T16:00:00-05:00",
                "endTime": "2026-10-23T17:00:00-05:00",
                "isDaytime": true,
                "temperature": 73,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 37
                },
                "windSpeed": "5 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/day/few?size=small",
                "shortForecast": "Sunny",
                "detailedForecast": ""
            },
            {
                "number": 3,
                "name": "",
                "startTime": "2026-10-23T17:00:00-05:00",
                "endTime": "2026-10-23T18:00:00-05:00",
                "isDaytime": true,
                "temperature": 70,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 41
                },
                "windSpeed": "5 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/day/few?size=small",
                "shortForecast": "Sunny",
                "detailedForecast": ""
            },
            {
                "number": 4,
                "name": "",
                "startTime": "2026-10-23T18:00:00-05:00",
                "endTime": "2026-10-23T19:00:00-05:00",
                "isDaytime": false,
                "temperature": 66,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 48
                },
                "windSpeed": "5 mph",
                "windDirection": "ESE",
                "icon": "https://api.weather.gov/icons/land/night/few?size=small",
                "shortForecast": "Mostly Clear",
                "detailedForecast": ""
            },
            {
                "number": 5,
                "name": "",
                "startTime": "2026-10-23T19:00:00-05:00",
                "endTime": "2026-10-23T20:00:00-05:00",
                "isDaytime": false,
                "temperature": 62,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 59
                },
                "windSpeed": "5 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 6,
                "name": "",
                "startTime": "2026-10-23T20:00:00-05:00",
                "endTime": "2026-10-23T21:00:00-05:00",
                "isDaytime": false,
                "temperature": 59,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 67
                },
                "windSpeed": "5 mph",
                "windDirection": "ESE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 7,
                "name": "",
                "startTime": "2026-10-23T21:00:00-05:00",
                "endTime": "2026-10-23T22:00:00-05:00",
                "isDaytime": false,
                "temperature": 57,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 72
                },
                "windSpeed": "5 mph",
                "windDirection": "ESE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 8,
                "name": "",
                "startTime": "2026-10-23T22:00:00-05:00",
                "endTime": "2026-10-23T23:00:00-05:00",
                "isDaytime": false,
                "temperature": 55,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 72
                },
                "windSpeed": "5 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 9,
                "name": "",
                "startTime": "2026-10-23T23:00:00-05:00",
                "endTime": "2026-10-24T00:00:00-05:00",
                "isDaytime": false,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 72
                },
                "windSpeed": "5 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/night/few?size=small",
                "shortForecast": "Mostly Clear",
                "detailedForecast": ""
            },
            {
                "number": 10,
                "name": "",
                "startTime": "2026-10-24T00:00:00-05:00",
                "endTime": "2026-10-24T01:00:00-05:00",
                "isDaytime": false,
                "temperature": 53,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 73
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/few?size=small",
                "shortForecast": "Mostly Clear",
                "detailedForecast": ""
            },
            {
                "number": 11,
                "name": "",
                "startTime": "2026-10-24T01:00:00-05:00",
                "endTime": "2026-10-24T02:00:00-05:00",
                "isDaytime": false,
                "temperature": 52,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 72
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/few?size=small",
                "shortForecast": "Mostly Clear",
                "detailedForecast": ""
            },
            {
                "number": 12,
                "name": "",
                "startTime": "2026-10-24T02:00:00-05:00",
                "endTime": "2026-10-24T03:00:00-05:00",
                "isDaytime": false,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 75
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/few?size=small",
                "shortForecast": "Mostly Clear",
                "detailedForecast": ""
            },
            {
                "number": 13,
                "name": "",
                "startTime": "2026-10-24T03:00:00-05:00",
                "endTime": "2026-10-24T04:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.111111111111111
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 77
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 14,
                "name": "",
                "startTime": "2026-10-24T04:00:00-05:00",
                "endTime": "2026-10-24T05:00:00-05:00",
                "isDaytime": false,
                "temperature": 49,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.111111111111111
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 80
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 15,
                "name": "",
                "startTime": "2026-10-24T05:00:00-05:00",
                "endTime": "2026-10-24T06:00:00-05:00",
                "isDaytime": false,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 5.555555555555555
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 81
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 16,
                "name": "",
                "startTime": "2026-10-24T06:00:00-05:00",
                "endTime": "2026-10-24T07:00:00-05:00",
                "isDaytime": true,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 5.555555555555555
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 81
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 17,
                "name": "",
                "startTime": "2026-10-24T07:00:00-05:00",
                "endTime": "2026-10-24T08:00:00-05:00",
                "isDaytime": true,
                "temperature": 47,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 5.555555555555555
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 83
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 18,
                "name": "",
                "startTime": "2026-10-24T08:00:00-05:00",
                "endTime": "2026-10-24T09:00:00-05:00",
                "isDaytime": true,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 83
                },
                "windSpeed": "5 mph",
                "windDirection": "SSE",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 19,
                "name": "",
                "startTime": "2026-10-24T09:00:00-05:00",
                "endTime": "2026-10-24T10:00:00-05:00",
                "isDaytime": true,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 73
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 20,
                "name": "",
                "startTime": "2026-10-24T10:00:00-05:00",
                "endTime": "2026-10-24T11:00:00-05:00",
                "isDaytime": true,
                "temperature": 59,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 64
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 21,
                "name": "",
                "startTime": "2026-10-24T11:00:00-05:00",
                "endTime": "2026-10-24T12:00:00-05:00",
                "isDaytime": true,
                "temperature": 63,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 55
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 22,
                "name": "",
                "startTime": "2026-10-24T12:00:00-05:00",
                "endTime": "2026-10-24T13:00:00-05:00",
                "isDaytime": true,
                "temperature": 66,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 49
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 23,
                "name": "",
                "startTime": "2026-10-24T13:00:00-05:00",
                "endTime": "2026-10-24T14:00:00-05:00",
                "isDaytime": true,
                "temperature": 69,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 46
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 24,
                "name": "",
                "startTime": "2026-10-24T14:00:00-05:00",
                "endTime": "2026-10-24T15:00:00-05:00",
                "isDaytime": true,
                "temperature": 70,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 44
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Partly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 25,
                "name": "",
                "startTime": "2026-10-24T15:00:00-05:00",
                "endTime": "2026-10-24T16:00:00-05:00",
                "isDaytime": true,
                "temperature": 71,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 42
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Partly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 26,
                "name": "",
                "startTime": "2026-10-24T16:00:00-05:00",
                "endTime": "2026-10-24T17:00:00-05:00",
                "isDaytime": true,
                "temperature": 72,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 41
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Partly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 27,
                "name": "",
                "startTime": "2026-10-24T17:00:00-05:00",
                "endTime": "2026-10-24T18:00:00-05:00",
                "isDaytime": true,
                "temperature": 70,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 45
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Partly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 28,
                "name": "",
                "startTime": "2026-10-24T18:00:00-05:00",
                "endTime": "2026-10-24T19:00:00-05:00",
                "isDaytime": false,
                "temperature": 66,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 49
                },
                "windSpeed": "5 mph",
                "windDirection": "SSE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 29,
                "name": "",
                "startTime": "2026-10-24T19:00:00-05:00",
                "endTime": "2026-10-24T20:00:00-05:00",
                "isDaytime": false,
                "temperature": 62,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 55
                },
                "windSpeed": "5 mph",
                "windDirection": "SSE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 30,
                "name": "",
                "startTime": "2026-10-24T20:00:00-05:00",
                "endTime": "2026-10-24T21:00:00-05:00",
                "isDaytime": false,
                "temperature": 60,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 60
                },
                "windSpeed": "5 mph",
                "windDirection": "SSE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 31,
                "name": "",
                "startTime": "2026-10-24T21:00:00-05:00",
                "endTime": "2026-10-24T22:00:00-05:00",
                "isDaytime": false,
                "temperature": 58,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.777777777777778
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 63
                },
                "windSpeed": "5 mph",
                "windDirection": "SSE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 32,
                "name": "",
                "startTime": "2026-10-24T22:00:00-05:00",
                "endTime": "2026-10-24T23:00:00-05:00",
                "isDaytime": false,
                "temperature": 56,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 66
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 33,
                "name": "",
                "startTime": "2026-10-24T23:00:00-05:00",
                "endTime": "2026-10-25T00:00:00-05:00",
                "isDaytime": false,
                "temperature": 55,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 69
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 34,
                "name": "",
                "startTime": "2026-10-25T00:00:00-05:00",
                "endTime": "2026-10-25T01:00:00-05:00",
                "isDaytime": false,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 72
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 35,
                "name": "",
                "startTime": "2026-10-25T01:00:00-05:00",
                "endTime": "2026-10-25T02:00:00-05:00",
                "isDaytime": false,
                "temperature": 53,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 74
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 36,
                "name": "",
                "startTime": "2026-10-25T02:00:00-05:00",
                "endTime": "2026-10-25T03:00:00-05:00",
                "isDaytime": false,
                "temperature": 52,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 75
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 37,
                "name": "",
                "startTime": "2026-10-25T03:00:00-05:00",
                "endTime": "2026-10-25T04:00:00-05:00",
                "isDaytime": false,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 78
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 38,
                "name": "",
                "startTime": "2026-10-25T04:00:00-05:00",
                "endTime": "2026-10-25T05:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 81
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 39,
                "name": "",
                "startTime": "2026-10-25T05:00:00-05:00",
                "endTime": "2026-10-25T06:00:00-05:00",
                "isDaytime": false,
                "temperature": 49,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 83
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 40,
                "name": "",
                "startTime": "2026-10-25T06:00:00-05:00",
                "endTime": "2026-10-25T07:00:00-05:00",
                "isDaytime": true,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 84
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 41,
                "name": "",
                "startTime": "2026-10-25T07:00:00-05:00",
                "endTime": "2026-10-25T08:00:00-05:00",
                "isDaytime": true,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 6.666666666666667
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 86
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 42,
                "name": "",
                "startTime": "2026-10-25T08:00:00-05:00",
                "endTime": "2026-10-25T09:00:00-05:00",
                "isDaytime": true,
                "temperature": 49,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 7.222222222222222
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 88
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 43,
                "name": "",
                "startTime": "2026-10-25T09:00:00-05:00",
                "endTime": "2026-10-25T10:00:00-05:00",
                "isDaytime": true,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 77
                },
                "windSpeed": "5 mph",
                "windDirection": "SSW",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 44,
                "name": "",
                "startTime": "2026-10-25T10:00:00-05:00",
                "endTime": "2026-10-25T11:00:00-05:00",
                "isDaytime": true,
                "temperature": 60,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 65
                },
                "windSpeed": "5 mph",
                "windDirection": "SSW",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 45,
                "name": "",
                "startTime": "2026-10-25T11:00:00-05:00",
                "endTime": "2026-10-25T12:00:00-05:00",
                "isDaytime": true,
                "temperature": 64,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 57
                },
                "windSpeed": "5 mph",
                "windDirection": "SSW",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 46,
                "name": "",
                "startTime": "2026-10-25T12:00:00-05:00",
                "endTime": "2026-10-25T13:00:00-05:00",
                "isDaytime": true,
                "temperature": 68,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 51
                },
                "windSpeed": "10 mph",
                "windDirection": "SSW",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 47,
                "name": "",
                "startTime": "2026-10-25T13:00:00-05:00",
                "endTime": "2026-10-25T14:00:00-05:00",
                "isDaytime": true,
                "temperature": 70,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 47
                },
                "windSpeed": "10 mph",
                "windDirection": "SSW",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 48,
                "name": "",
                "startTime": "2026-10-25T14:00:00-05:00",
                "endTime": "2026-10-25T15:00:00-05:00",
                "isDaytime": true,
                "temperature": 73,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 44
                },
                "windSpeed": "10 mph",
                "windDirection": "SSW",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 49,
                "name": "",
                "startTime": "2026-10-25T15:00:00-05:00",
                "endTime": "2026-10-25T16:00:00-05:00",
                "isDaytime": true,
                "temperature": 74,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 41
                },
                "windSpeed": "10 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 50,
                "name": "",
                "startTime": "2026-10-25T16:00:00-05:00",
                "endTime": "2026-10-25T17:00:00-05:00",
                "isDaytime": true,
                "temperature": 74,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 42
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 51,
                "name": "",
                "startTime": "2026-10-25T17:00:00-05:00",
                "endTime": "2026-10-25T18:00:00-05:00",
                "isDaytime": true,
                "temperature": 71,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 46
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/day/sct?size=small",
                "shortForecast": "Mostly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 52,
                "name": "",
                "startTime": "2026-10-25T18:00:00-05:00",
                "endTime": "2026-10-25T19:00:00-05:00",
                "isDaytime": false,
                "temperature": 67,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 52
                },
                "windSpeed": "5 mph",
                "windDirection": "S",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 53,
                "name": "",
                "startTime": "2026-10-25T19:00:00-05:00",
                "endTime": "2026-10-25T20:00:00-05:00",
                "isDaytime": false,
                "temperature": 64,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 59
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=small",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 54,
                "name": "",
                "startTime": "2026-10-25T20:00:00-05:00",
                "endTime": "2026-10-25T21:00:00-05:00",
                "isDaytime": false,
                "temperature": 61,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 65
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 55,
                "name": "",
                "startTime": "2026-10-25T21:00:00-05:00",
                "endTime": "2026-10-25T22:00:00-05:00",
                "isDaytime": false,
                "temperature": 59,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 68
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 56,
                "name": "",
                "startTime": "2026-10-25T22:00:00-05:00",
                "endTime": "2026-10-25T23:00:00-05:00",
                "isDaytime": false,
                "temperature": 58,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 70
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 57,
                "name": "",
                "startTime": "2026-10-25T23:00:00-05:00",
                "endTime": "2026-10-26T00:00:00-05:00",
                "isDaytime": false,
                "temperature": 57,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 73
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 58,
                "name": "",
                "startTime": "2026-10-26T00:00:00-05:00",
                "endTime": "2026-10-26T01:00:00-05:00",
                "isDaytime": false,
                "temperature": 55,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 76
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 59,
                "name": "",
                "startTime": "2026-10-26T01:00:00-05:00",
                "endTime": "2026-10-26T02:00:00-05:00",
                "isDaytime": false,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 78
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 60,
                "name": "",
                "startTime": "2026-10-26T02:00:00-05:00",
                "endTime": "2026-10-26T03:00:00-05:00",
                "isDaytime": false,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 80
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 61,
                "name": "",
                "startTime": "2026-10-26T03:00:00-05:00",
                "endTime": "2026-10-26T04:00:00-05:00",
                "isDaytime": false,
                "temperature": 53,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 81
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 62,
                "name": "",
                "startTime": "2026-10-26T04:00:00-05:00",
                "endTime": "2026-10-26T05:00:00-05:00",
                "isDaytime": false,
                "temperature": 52,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 84
                },
                "windSpeed": "0 mph",
                "windDirection": "",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 63,
                "name": "",
                "startTime": "2026-10-26T05:00:00-05:00",
                "endTime": "2026-10-26T06:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 88
                },
                "windSpeed": "5 mph",
                "windDirection": "N",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 64,
                "name": "",
                "startTime": "2026-10-26T06:00:00-05:00",
                "endTime": "2026-10-26T07:00:00-05:00",
                "isDaytime": true,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.333333333333334
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 91
                },
                "windSpeed": "5 mph",
                "windDirection": "NNE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 65,
                "name": "",
                "startTime": "2026-10-26T07:00:00-05:00",
                "endTime": "2026-10-26T08:00:00-05:00",
                "isDaytime": true,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 91
                },
                "windSpeed": "5 mph",
                "windDirection": "NNE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 66,
                "name": "",
                "startTime": "2026-10-26T08:00:00-05:00",
                "endTime": "2026-10-26T09:00:00-05:00",
                "isDaytime": true,
                "temperature": 53,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 85
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 67,
                "name": "",
                "startTime": "2026-10-26T09:00:00-05:00",
                "endTime": "2026-10-26T10:00:00-05:00",
                "isDaytime": true,
                "temperature": 56,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 76
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 68,
                "name": "",
                "startTime": "2026-10-26T10:00:00-05:00",
                "endTime": "2026-10-26T11:00:00-05:00",
                "isDaytime": true,
                "temperature": 59,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 69
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 69,
                "name": "",
                "startTime": "2026-10-26T11:00:00-05:00",
                "endTime": "2026-10-26T12:00:00-05:00",
                "isDaytime": true,
                "temperature": 62,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 64
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 70,
                "name": "",
                "startTime": "2026-10-26T12:00:00-05:00",
                "endTime": "2026-10-26T13:00:00-05:00",
                "isDaytime": true,
                "temperature": 64,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 61
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 71,
                "name": "",
                "startTime": "2026-10-26T13:00:00-05:00",
                "endTime": "2026-10-26T14:00:00-05:00",
                "isDaytime": true,
                "temperature": 65,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10.555555555555555
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 59
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 72,
                "name": "",
                "startTime": "2026-10-26T14:00:00-05:00",
                "endTime": "2026-10-26T15:00:00-05:00",
                "isDaytime": true,
                "temperature": 66,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 58
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 73,
                "name": "",
                "startTime": "2026-10-26T15:00:00-05:00",
                "endTime": "2026-10-26T16:00:00-05:00",
                "isDaytime": true,
                "temperature": 65,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 57
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 74,
                "name": "",
                "startTime": "2026-10-26T16:00:00-05:00",
                "endTime": "2026-10-26T17:00:00-05:00",
                "isDaytime": true,
                "temperature": 64,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 59
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 75,
                "name": "",
                "startTime": "2026-10-26T17:00:00-05:00",
                "endTime": "2026-10-26T18:00:00-05:00",
                "isDaytime": true,
                "temperature": 62,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 62
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 76,
                "name": "",
                "startTime": "2026-10-26T18:00:00-05:00",
                "endTime": "2026-10-26T19:00:00-05:00",
                "isDaytime": false,
                "temperature": 59,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 70
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 77,
                "name": "",
                "startTime": "2026-10-26T19:00:00-05:00",
                "endTime": "2026-10-26T20:00:00-05:00",
                "isDaytime": false,
                "temperature": 56,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 79
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 78,
                "name": "",
                "startTime": "2026-10-26T20:00:00-05:00",
                "endTime": "2026-10-26T21:00:00-05:00",
                "isDaytime": false,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 86
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 79,
                "name": "",
                "startTime": "2026-10-26T21:00:00-05:00",
                "endTime": "2026-10-26T22:00:00-05:00",
                "isDaytime": false,
                "temperature": 53,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 90
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 80,
                "name": "",
                "startTime": "2026-10-26T22:00:00-05:00",
                "endTime": "2026-10-26T23:00:00-05:00",
                "isDaytime": false,
                "temperature": 52,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 93
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 81,
                "name": "",
                "startTime": "2026-10-26T23:00:00-05:00",
                "endTime": "2026-10-27T00:00:00-05:00",
                "isDaytime": false,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 94
                },
                "windSpeed": "10 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 82,
                "name": "",
                "startTime": "2026-10-27T00:00:00-05:00",
                "endTime": "2026-10-27T01:00:00-05:00",
                "isDaytime": false,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 95
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 83,
                "name": "",
                "startTime": "2026-10-27T01:00:00-05:00",
                "endTime": "2026-10-27T02:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 2
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 95
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 84,
                "name": "",
                "startTime": "2026-10-27T02:00:00-05:00",
                "endTime": "2026-10-27T03:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 2
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 96
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 85,
                "name": "",
                "startTime": "2026-10-27T03:00:00-05:00",
                "endTime": "2026-10-27T04:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 2
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 96
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 86,
                "name": "",
                "startTime": "2026-10-27T04:00:00-05:00",
                "endTime": "2026-10-27T05:00:00-05:00",
                "isDaytime": false,
                "temperature": 50,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 2
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 97
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 87,
                "name": "",
                "startTime": "2026-10-27T05:00:00-05:00",
                "endTime": "2026-10-27T06:00:00-05:00",
                "isDaytime": false,
                "temperature": 49,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 2
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 99
                },
                "windSpeed": "5 mph",
                "windDirection": "ENE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 88,
                "name": "",
                "startTime": "2026-10-27T06:00:00-05:00",
                "endTime": "2026-10-27T07:00:00-05:00",
                "isDaytime": true,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 2
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 99
                },
                "windSpeed": "5 mph",
                "windDirection": "ENE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Partly Sunny",
                "detailedForecast": ""
            },
            {
                "number": 89,
                "name": "",
                "startTime": "2026-10-27T07:00:00-05:00",
                "endTime": "2026-10-27T08:00:00-05:00",
                "isDaytime": true,
                "temperature": 49,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 8.88888888888889
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 98
                },
                "windSpeed": "5 mph",
                "windDirection": "ENE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 90,
                "name": "",
                "startTime": "2026-10-27T08:00:00-05:00",
                "endTime": "2026-10-27T09:00:00-05:00",
                "isDaytime": true,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 9.444444444444445
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 94
                },
                "windSpeed": "5 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 91,
                "name": "",
                "startTime": "2026-10-27T09:00:00-05:00",
                "endTime": "2026-10-27T10:00:00-05:00",
                "isDaytime": true,
                "temperature": 54,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 88
                },
                "windSpeed": "5 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 92,
                "name": "",
                "startTime": "2026-10-27T10:00:00-05:00",
                "endTime": "2026-10-27T11:00:00-05:00",
                "isDaytime": true,
                "temperature": 57,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10.555555555555555
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 82
                },
                "windSpeed": "5 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 93,
                "name": "",
                "startTime": "2026-10-27T11:00:00-05:00",
                "endTime": "2026-10-27T12:00:00-05:00",
                "isDaytime": true,
                "temperature": 59,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 11.11111111111111
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 76
                },
                "windSpeed": "5 mph",
                "windDirection": "ESE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 94,
                "name": "",
                "startTime": "2026-10-27T12:00:00-05:00",
                "endTime": "2026-10-27T13:00:00-05:00",
                "isDaytime": true,
                "temperature": 61,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 11.11111111111111
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 71
                },
                "windSpeed": "5 mph",
                "windDirection": "ESE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 95,
                "name": "",
                "startTime": "2026-10-27T13:00:00-05:00",
                "endTime": "2026-10-27T14:00:00-05:00",
                "isDaytime": true,
                "temperature": 62,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 11.11111111111111
                },
                "relativeHumidity": {
                    "unitCode": "wmoUnit:percent",
                    "value": 67
                },
                "windSpeed": "5 mph",
                "windDirection": "ESE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=small",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": ""
            },
            {
                "number": 96,
                "name": "",
                "startTime": "2026-10-27T14:00:00-05:00",
                "endTime": "2026-10-27T15:00:00-05:00",
                "isDaytime": true,
                "temperature": 64,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 8
                },
                "dewpoint": {
                    "unitCode": "wmoUnit:degC",
                    "value": 10.5555555
```
