# weather/forecast

- source: https://api.weather.gov/gridpoints/LWX/109,90/forecast
- status: 200
- bytes: 12583
- fetchedAt: 2026-10-23T20:34:59Z

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
                    -76.6012,
                    39.257
                ],
                [
                    -76.5973,
                    39.2789
                ],
                [
                    -76.6256,
                    39.2819
                ],
                [
                    -76.6295,
                    39.26
                ],
                [
                    -76.6012,
                    39.257
                ]
            ]
        ]
    },
    "properties": {
        "units": "us",
        "forecastGenerator": "BaselineForecastGenerator",
        "generatedAt": "2026-10-23T20:34:59+00:00",
        "updateTime": "2026-10-23T18:22:45+00:00",
        "validTimes": "2026-10-23T12:00:00+00:00/P7DT13H",
        "elevation": {
            "unitCode": "wmoUnit:m",
            "value": 0.9144
        },
        "periods": [
            {
                "number": 1,
                "name": "This Afternoon",
                "startTime": "2026-10-23T16:00:00-04:00",
                "endTime": "2026-10-23T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 64,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "7 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
                "shortForecast": "Sunny",
                "detailedForecast": "Sunny, with a high near 64. Northeast wind around 7 mph."
            },
            {
                "number": 2,
                "name": "Tonight",
                "startTime": "2026-10-23T18:00:00-04:00",
                "endTime": "2026-10-24T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 44,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "0 to 6 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/few?size=medium",
                "shortForecast": "Mostly Clear",
                "detailedForecast": "Mostly clear, with a low around 44. Northeast wind 0 to 6 mph."
            },
            {
                "number": 3,
                "name": "Saturday",
                "startTime": "2026-10-24T06:00:00-04:00",
                "endTime": "2026-10-24T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 63,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "1 to 5 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
                "shortForecast": "Sunny",
                "detailedForecast": "Sunny, with a high near 63. East wind 1 to 5 mph."
            },
            {
                "number": 4,
                "name": "Saturday Night",
                "startTime": "2026-10-24T18:00:00-04:00",
                "endTime": "2026-10-25T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 42,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "2 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/night/skc?size=medium",
                "shortForecast": "Clear",
                "detailedForecast": "Clear, with a low around 42. East wind around 2 mph."
            },
            {
                "number": 5,
                "name": "Sunday",
                "startTime": "2026-10-25T06:00:00-04:00",
                "endTime": "2026-10-25T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 66,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "2 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
                "shortForecast": "Sunny",
                "detailedForecast": "Sunny, with a high near 66. East wind around 2 mph."
            },
            {
                "number": 6,
                "name": "Sunday Night",
                "startTime": "2026-10-25T18:00:00-04:00",
                "endTime": "2026-10-26T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 42,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "1 mph",
                "windDirection": "NW",
                "icon": "https://api.weather.gov/icons/land/night/few?size=medium",
                "shortForecast": "Mostly Clear",
                "detailedForecast": "Mostly clear, with a low around 42."
            },
            {
                "number": 7,
                "name": "Monday",
                "startTime": "2026-10-26T06:00:00-04:00",
                "endTime": "2026-10-26T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 71,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "1 to 5 mph",
                "windDirection": "W",
                "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
                "shortForecast": "Sunny",
                "detailedForecast": "Sunny, with a high near 71."
            },
            {
                "number": 8,
                "name": "Monday Night",
                "startTime": "2026-10-26T18:00:00-04:00",
                "endTime": "2026-10-27T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "5 mph",
                "windDirection": "NW",
                "icon": "https://api.weather.gov/icons/land/night/few?size=medium",
                "shortForecast": "Mostly Clear",
                "detailedForecast": "Mostly clear, with a low around 51."
            },
            {
                "number": 9,
                "name": "Tuesday",
                "startTime": "2026-10-27T06:00:00-04:00",
                "endTime": "2026-10-27T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 68,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "7 mph",
                "windDirection": "N",
                "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
                "shortForecast": "Sunny",
                "detailedForecast": "Sunny, with a high near 68."
            },
            {
                "number": 10,
                "name": "Tuesday Night",
                "startTime": "2026-10-27T18:00:00-04:00",
                "endTime": "2026-10-28T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 48,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 0
                },
                "windSpeed": "5 mph",
                "windDirection": "NE",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=medium",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": "Partly cloudy, with a low around 48."
            },
            {
                "number": 11,
                "name": "Wednesday",
                "startTime": "2026-10-28T06:00:00-04:00",
                "endTime": "2026-10-28T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 65,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "windSpeed": "2 to 6 mph",
                "windDirection": "E",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=medium",
                "shortForecast": "Partly Sunny",
                "detailedForecast": "Partly sunny, with a high near 65."
            },
            {
                "number": 12,
                "name": "Wednesday Night",
                "startTime": "2026-10-28T18:00:00-04:00",
                "endTime": "2026-10-29T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 51,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "windSpeed": "1 to 5 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/night/bkn?size=medium",
                "shortForecast": "Mostly Cloudy",
                "detailedForecast": "Mostly cloudy, with a low around 51."
            },
            {
                "number": 13,
                "name": "Thursday",
                "startTime": "2026-10-29T06:00:00-04:00",
                "endTime": "2026-10-29T18:00:00-04:00",
                "isDaytime": true,
                "temperature": 70,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 1
                },
                "windSpeed": "1 to 6 mph",
                "windDirection": "SE",
                "icon": "https://api.weather.gov/icons/land/day/bkn?size=medium",
                "shortForecast": "Partly Sunny",
                "detailedForecast": "Partly sunny, with a high near 70."
            },
            {
                "number": 14,
                "name": "Thursday Night",
                "startTime": "2026-10-29T18:00:00-04:00",
                "endTime": "2026-10-30T06:00:00-04:00",
                "isDaytime": false,
                "temperature": 52,
                "temperatureUnit": "F",
                "temperatureTrend": null,
                "probabilityOfPrecipitation": {
                    "unitCode": "wmoUnit:percent",
                    "value": 3
                },
                "windSpeed": "1 to 5 mph",
                "windDirection": "SW",
                "icon": "https://api.weather.gov/icons/land/night/sct?size=medium",
                "shortForecast": "Partly Cloudy",
                "detailedForecast": "Partly cloudy, with a low around 52."
            }
        ]
    }
}
```
