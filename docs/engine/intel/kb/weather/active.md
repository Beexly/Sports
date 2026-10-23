# weather/active

- source: https://api.weather.gov/alerts/active?area=MD
- status: 200
- bytes: 22593
- fetchedAt: 2026-10-23T20:29:28Z

```json
{
    "@context": [
        "https://geojson.org/geojson-ld/geojson-context.jsonld",
        {
            "@version": "1.1",
            "wx": "https://api.weather.gov/ontology#",
            "@vocab": "https://api.weather.gov/ontology#"
        }
    ],
    "type": "FeatureCollection",
    "features": [
        {
            "id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0-KEEPALIVE-35089",
            "type": "Feature",
            "geometry": null,
            "properties": {
                "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0-KEEPALIVE-35089",
                "@type": "wx:Alert",
                "id": "urn:oid:2.49.0.1.840.0-KEEPALIVE-35089",
                "areaDesc": "Montgomery",
                "geocode": {
                    "SAME": [
                        "024031"
                    ],
                    "UGC": [
                        "MDC031"
                    ]
                },
                "affectedZones": [
                    "https://api.weather.gov/zones/county/MDC031"
                ],
                "references": [],
                "sent": "2026-10-23T20:24:58+00:00",
                "effective": "2026-10-23T20:24:58+00:00",
                "onset": null,
                "expires": "2026-10-23T20:34:58+00:00",
                "ends": null,
                "status": "Test",
                "messageType": "Alert",
                "category": "Met",
                "severity": "Unknown",
                "certainty": "Unknown",
                "urgency": "Unknown",
                "event": "Test Message",
                "sender": "w-nws.webmaster@noaa.gov",
                "senderName": "NWS",
                "headline": null,
                "description": "Monitoring message only. Please disregard.",
                "instruction": "Monitoring message only. Please disregard.",
                "response": "None",
                "note": "This is only a test for monitoring of vital dissemination systems.",
                "parameters": {
                    "AWIPSidentifier": [
                        "KEPWBC"
                    ],
                    "WMOidentifier": [
                        "NZUS91 KWBC 232024"
                    ],
                    "BLOCKCHANNEL": [
                        "CMAS",
                        "EAS",
                        "NWEM"
                    ]
                },
                "scope": "Public",
                "code": "IPAWSv1.0",
                "language": "en-US",
                "web": "http://www.weather.gov",
                "eventCode": {
                    "SAME": [
                        "NWS"
                    ],
                    "NationalWeatherService": [
                        "TST"
                    ]
                }
            }
        },
        {
            "id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.704851e0353f06df1bca5e07dd58e4186c1964b6.002.1",
            "type": "Feature",
            "geometry": null,
            "properties": {
                "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.704851e0353f06df1bca5e07dd58e4186c1964b6.002.1",
                "@type": "wx:Alert",
                "id": "urn:oid:2.49.0.1.840.0.704851e0353f06df1bca5e07dd58e4186c1964b6.002.1",
                "areaDesc": "Dorchester; Wicomico; Somerset",
                "geocode": {
                    "SAME": [
                        "024019",
                        "024045",
                        "024039"
                    ],
                    "UGC": [
                        "MDZ021",
                        "MDZ022",
                        "MDZ023"
                    ]
                },
                "affectedZones": [
                    "https://api.weather.gov/zones/forecast/MDZ021",
                    "https://api.weather.gov/zones/forecast/MDZ022",
                    "https://api.weather.gov/zones/forecast/MDZ023"
                ],
                "references": [
                    {
                        "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.659961a282fb5d998520d1a7a443e89d2d9f1405.002.1",
                        "identifier": "urn:oid:2.49.0.1.840.0.659961a282fb5d998520d1a7a443e89d2d9f1405.002.1",
                        "sender": "w-nws.webmaster@noaa.gov",
                        "sent": "2026-10-23T09:57:00-04:00"
                    },
                    {
                        "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.9efbd85bc49b4c07954743b05415b4d8ed3bd696.002.1",
                        "identifier": "urn:oid:2.49.0.1.840.0.9efbd85bc49b4c07954743b05415b4d8ed3bd696.002.1",
                        "sender": "w-nws.webmaster@noaa.gov",
                        "sent": "2026-10-23T14:37:00-04:00"
                    }
                ],
                "sent": "2026-10-23T14:39:00-04:00",
                "effective": "2026-10-23T14:39:00-04:00",
                "onset": "2026-10-23T14:39:00-04:00",
                "expires": "2026-10-23T22:45:00-04:00",
                "ends": "2026-10-24T16:00:00-04:00",
                "status": "Actual",
                "messageType": "Update",
                "category": "Met",
                "severity": "Minor",
                "certainty": "Likely",
                "urgency": "Expected",
                "event": "Coastal Flood Advisory",
                "sender": "w-nws.webmaster@noaa.gov",
                "senderName": "NWS Wakefield VA",
                "headline": "Coastal Flood Advisory issued October 23 at 2:39PM EDT until October 24 at 4:00PM EDT by NWS Wakefield VA",
                "description": "* WHAT...Up to one foot of inundation above ground level in low-\nlying areas near shorelines and tidal waterways.\n\n* WHERE...Dorchester, Wicomico and Somerset Counties.\n\n* WHEN...Until 4 PM EDT Saturday.\n\n* IMPACTS...Shallow flooding is expected in the most vulnerable\nlocations near the waterfront and shoreline resulting in a low\nthreat of property damage. Expect up to one foot of water\nabove ground level in low lying, vulnerable areas. Some roads\nand low lying property including parking lots, parks and lawns\nnear the waterfront will experience shallow flooding.",
                "instruction": "If travel is required, allow extra time as some roads may be\nclosed. Do not drive around barricades or through water of\nunknown depth. Take the necessary actions to protect flood-prone\nproperty.",
                "response": "Monitor",
                "note": null,
                "parameters": {
                    "AWIPSidentifier": [
                        "CFWAKQ"
                    ],
                    "WMOidentifier": [
                        "WHUS41 KAKQ 231839"
                    ],
                    "NWSheadline": [
                        "COASTAL FLOOD ADVISORY REMAINS IN EFFECT UNTIL 4 PM EDT SATURDAY"
                    ],
                    "BLOCKCHANNEL": [
                        "EAS",
                        "NWEM",
                        "CMAS"
                    ],
                    "VTEC": [
                        "/O.CON.KAKQ.CF.Y.0013.000000T0000Z-261024T2000Z/"
                    ],
                    "eventEndingTime": [
                        "2026-10-24T16:00:00-04:00"
                    ],
                    "expiredReferences": [
                        "w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.504e5227d300291f3f694589d35160048f36fccb.001.1,2026-10-23T02:43:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.52e8abf432c9eacd7d746a6f1752733a6e80350f.001.1,2026-10-22T20:48:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.6ff19de5c3c49444a3be8e6928e51e307878dd73.005.1,2026-10-22T18:00:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.e6e218d645ae6c970b5ba0639311513047bad32f.001.2,2026-10-22T13:55:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.8d14ae8a6f477069b4efb54c04085a3123644bb1.003.1,2026-10-21T03:59:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.f748759c1a4abb7b85f3baa8c76243a734232df7.002.1,2026-10-21T14:07:00-04:00"
                    ]
                },
                "scope": "Public",
                "code": "IPAWSv1.0",
                "language": "en-US",
                "web": "http://www.weather.gov",
                "eventCode": {
                    "SAME": [
                        "NWS"
                    ],
                    "NationalWeatherService": [
                        "CFY"
                    ]
                }
            }
        },
        {
            "id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.a99edca64b8128d14c937b14bf813842a116d788.002.1",
            "type": "Feature",
            "geometry": null,
            "properties": {
                "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.a99edca64b8128d14c937b14bf813842a116d788.002.1",
                "@type": "wx:Alert",
                "id": "urn:oid:2.49.0.1.840.0.a99edca64b8128d14c937b14bf813842a116d788.002.1",
                "areaDesc": "Anne Arundel",
                "geocode": {
                    "SAME": [
                        "024003"
                    ],
                    "UGC": [
                        "MDZ014"
                    ]
                },
                "affectedZones": [
                    "https://api.weather.gov/zones/forecast/MDZ014"
                ],
                "references": [
                    {
                        "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.178df2b9de78f733345ce0dc89d8972a040c22ed.004.1",
                        "identifier": "urn:oid:2.49.0.1.840.0.178df2b9de78f733345ce0dc89d8972a040c22ed.004.1",
                        "sender": "w-nws.webmaster@noaa.gov",
                        "sent": "2026-10-23T06:08:00-04:00"
                    }
                ],
                "sent": "2026-10-23T14:37:00-04:00",
                "effective": "2026-10-23T14:37:00-04:00",
                "onset": "2026-10-23T14:37:00-04:00",
                "expires": "2026-10-23T19:00:00-04:00",
                "ends": "2026-10-23T19:00:00-04:00",
                "status": "Actual",
                "messageType": "Update",
                "category": "Met",
                "severity": "Minor",
                "certainty": "Likely",
                "urgency": "Expected",
                "event": "Coastal Flood Advisory",
                "sender": "w-nws.webmaster@noaa.gov",
                "senderName": "NWS Baltimore MD/Washington DC",
                "headline": "Coastal Flood Advisory issued October 23 at 2:37PM EDT until October 23 at 7:00PM EDT by NWS Baltimore MD/Washington DC",
                "description": "* WHAT...Up to one half foot of inundation above ground level in\nlow lying areas due to tidal flooding.\n\n* WHERE...Shoreline in Anne Arundel County.\n\n* WHEN...Until 7 PM EDT this evening, especially around the time\nof high tide.\n\n* IMPACTS...At 2.6 feet, water may begin to pond in the parking\nlot at Annapolis City Dock, and surround the Alex Haley\nMemorial.\n\n* ADDITIONAL DETAILS...Tides one to one and a half feet above\nnormal. The next high tide at Annapolis U.S. Naval Academy is at\n3:59 PM.",
                "instruction": "If travel is required, allow extra time as some roads may be\nclosed. Do not drive around barricades or through water of\nunknown depth. Take the necessary actions to protect flood-prone\nproperty.",
                "response": "Monitor",
                "note": null,
                "parameters": {
                    "AWIPSidentifier": [
                        "CFWLWX"
                    ],
                    "WMOidentifier": [
                        "WHUS41 KLWX 231837"
                    ],
                    "NWSheadline": [
                        "COASTAL FLOOD ADVISORY REMAINS IN EFFECT UNTIL 7 PM EDT THIS EVENING"
                    ],
                    "BLOCKCHANNEL": [
                        "EAS",
                        "NWEM",
                        "CMAS"
                    ],
                    "VTEC": [
                        "/O.CON.KLWX.CF.Y.0056.000000T0000Z-261023T2300Z/"
                    ],
                    "eventEndingTime": [
                        "2026-10-23T19:00:00-04:00"
                    ],
                    "expiredReferences": [
                        "w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.6d6bf0c41df87b9e67e209d6a8ab63b391c70ab0.002.1,2026-10-23T03:21:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.b0870c470c41ab478e27570924164cf1f9c43ebd.004.1,2026-10-23T02:35:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.36ce952cd24b6fcbf8356667a615ffc53b0c471f.001.1,2026-10-23T00:09:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.abb2da47721e281679a1a52a04bbf1d2c8de977c.001.1,2026-10-22T20:57:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.539377bc59d770306aa6b4f024d4fa793de64b89.002.1,2026-10-22T13:57:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.096220afdb0d92a6aa75f91c2f5965fc54723198.001.1,2026-10-22T04:57:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.476313ac00a6bb5817412d0ca19c3ba940c93a16.002.1,2026-10-21T22:11:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.df0d4bf14e395ac06fa95a3e92558056c31c9434.002.1,2026-10-21T18:12:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.cdec5423326d8b91b8d39fd4a9f44cff0424906a.001.1,2026-10-21T15:08:00-04:00 w-nws.webmaster@noaa.gov,urn:oid:2.49.0.1.840.0.cd64bf5c194ef586aef5af41bf85e76cb1d2e5e9.001.1,2026-10-21T06:55:00-04:00"
                    ]
                },
                "scope": "Public",
                "code": "IPAWSv1.0",
                "language": "en-US",
                "web": "http://www.weather.gov",
                "eventCode": {
                    "SAME": [
                        "NWS"
                    ],
                    "NationalWeatherService": [
                        "CFY"
                    ]
                }
            }
        },
        {
            "id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.53210c7cba809eacc54bac9daf2c2fc4ed2c19cc.001.1",
            "type": "Feature",
            "geometry": null,
            "properties": {
                "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.53210c7cba809eacc54bac9daf2c2fc4ed2c19cc.001.1",
                "@type": "wx:Alert",
                "id": "urn:oid:2.49.0.1.840.0.53210c7cba809eacc54bac9daf2c2fc4ed2c19cc.001.1",
                "areaDesc": "Frederick; Carroll; Northern Baltimore; Cecil; Northwest Harford; Southeast Harford",
                "geocode": {
                    "SAME": [
                        "024021",
                        "024013",
                        "024005",
                        "024015",
                        "024025"
                    ],
                    "UGC": [
                        "MDZ004",
                        "MDZ005",
                        "MDZ006",
                        "MDZ008",
                        "MDZ507",
                        "MDZ508"
                    ]
                },
                "affectedZones": [
                    "https://api.weather.gov/zones/forecast/MDZ004",
                    "https://api.weather.gov/zones/forecast/MDZ005",
                    "https://api.weather.gov/zones/forecast/MDZ006",
                    "https://api.weather.gov/zones/forecast/MDZ008",
                    "https://api.weather.gov/zones/forecast/MDZ507",
                    "https://api.weather.gov/zones/forecast/MDZ508"
                ],
                "references": [],
                "sent": "2026-10-23T14:13:00-04:00",
                "effective": "2026-10-23T14:13:00-04:00",
                "onset": "2026-10-24T01:00:00-04:00",
                "expires": "2026-10-23T22:15:00-04:00",
                "ends": "2026-10-24T09:00:00-04:00",
                "status": "Actual",
                "messageType": "Alert",
                "category": "Met",
                "severity": "Minor",
                "certainty": "Likely",
                "urgency": "Expected",
                "event": "Frost Advisory",
                "sender": "w-nws.webmaster@noaa.gov",
                "senderName": "NWS Baltimore MD/Washington DC",
                "headline": "Frost Advisory issued October 23 at 2:13PM EDT until October 24 at 9:00AM EDT by NWS Baltimore MD/Washington DC",
                "description": "* WHAT...Temperatures as low as 33 will result in frost formation.\n\n* WHERE...Carroll, Frederick, Cecil, Northern Baltimore, and Harford\nCounties in Maryland.\n\n* WHEN...From 1 AM to 9 AM EDT Saturday.\n\n* IMPACTS...Frost could harm sensitive outdoor vegetation. Sensitive\noutdoor plants may be killed if left uncovered.",
                "instruction": "Take steps now to protect tender plants from the cold.",
                "response": "Prepare",
                "note": null,
                "parameters": {
                    "AWIPSidentifier": [
                        "NPWLWX"
                    ],
                    "WMOidentifier": [
                        "WWUS71 KLWX 231813"
                    ],
                    "NWSheadline": [
                        "FROST ADVISORY IN EFFECT FROM 1 AM TO 9 AM EDT SATURDAY"
                    ],
                    "BLOCKCHANNEL": [
                        "EAS",
                        "NWEM",
                        "CMAS"
                    ],
                    "VTEC": [
                        "/O.NEW.KLWX.FR.Y.0012.261024T0500Z-261024T1300Z/"
                    ],
                    "eventEndingTime": [
                        "2026-10-24T09:00:00-04:00"
                    ]
                },
                "scope": "Public",
                "code": "IPAWSv1.0",
                "language": "en-US",
                "web": "http://www.weather.gov",
                "eventCode": {
                    "SAME": [
                        "NWS"
                    ],
                    "NationalWeatherService": [
                        "FRY"
                    ]
                }
            }
        },
        {
            "id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.6ce9eb2ee7b32fabe3225396510ad167f2b1c983.002.1",
            "type": "Feature",
            "geometry": null,
            "properties": {
                "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.6ce9eb2ee7b32fabe3225396510ad167f2b1c983.002.1",
                "@type": "wx:Alert",
                "id": "urn:oid:2.49.0.1.840.0.6ce9eb2ee7b32fabe3225396510ad167f2b1c983.002.1",
                "areaDesc": "New Castle; Kent; Kent; Queen Anne's; Talbot; Caroline",
                "geocode": {
                    "SAME": [
                        "010003",
                        "010001",
                        "024029",
                        "024035",
                        "024041",
                        "024011"
                    ],
                    "UGC": [
                        "DEZ001",
                        "DEZ002",
                        "MDZ012",
                        "MDZ015",
                        "MDZ019",
                        "MDZ020"
                    ]
                },
                "affectedZones": [
                    "https://api.weather.gov/zones/forecast/DEZ001",
                    "https://api.weather.gov/zones/forecast/DEZ002",
                    "https://api.weather.gov/zones/forecast/MDZ012",
                    "https://api.weather.gov/zones/forecast/MDZ015",
                    "https://api.weather.gov/zones/forecast/MDZ019",
                    "https://api.weather.gov/zones/forecast/MDZ020"
                ],
                "references": [],
                "sent": "2026-10-23T14:04:00-04:00",
                "effective": "2026-10-23T14:04:00-04:00",
                "onset": "2026-10-24T00:00:00-04:00",
                "expires": "2026-10-24T09:00:00-04:00",
                "ends": "2026-10-24T09:00:00-04:00",
                "status": "Actual",
                "messageType": "Alert",
                "category": "Met",
                "severity": "Minor",
                "certainty": "Likely",
                "urgency": "Expected",
                "event": "Frost Advisory",
                "sender": "w-nws.webmaster@noaa.gov",
                "senderName": "NWS Mount Holly NJ",
                "headline": "Frost Advisory issued October 23 at 2:04PM EDT until October 24 at 9:00AM EDT by NWS Mount Holly NJ",
                "description": "* WHAT...Temperatures as low as 35 will result in frost formation.\n\n* WHERE...In Delaware, Kent and New Castle Counties. In Maryland,\nCaroline, Kent MD, Queen Annes, and Talbot Counties.\n\n* WHEN...From midnight tonight to 9 AM EDT Saturday.\n\n* IMPACTS...Frost could harm sensitive outdoor vegetation. Sensitive\noutdoor plants may be killed if left uncovered.",
                "instruction": "Take steps now to protect tender plants from the cold.",
                "response": "Prepare",
                "note": null,
                "parameters": {
                    "AWIPSidentifier": [
                        "NPWPHI"
                    ],
                    "WMOidentifier": [
                        "WWUS71 KPHI 231804"
                    ],
                    "NWSheadline": [
                        "FROST ADVISORY IN EFFECT FROM MIDNIGHT TONIGHT TO 9 AM EDT SATURDAY"
                    ],
                    "BLOCKCHANNEL": [
                        "EAS",
                        "NWEM",
                        "CMAS"
                    ],
                    "VTEC": [
                        "/O.NEW.KPHI.FR.Y.0009.261024T0400Z-261024T1300Z/"
                    ],
                    "eventEndingTime": [
                        "2026-10-24T09:00:00-04:00"
                    ]
                },
                "scope": "Public",
                "code": "IPAWSv1.0",
                "language": "en-US",
                "web": "http://www.weather.gov",
                "eventCode": {
                    "SAME": [
                        "NWS"
                    ],
                    "NationalWeatherService": [
                        "FRY"
                    ]
                }
            }
        }
    ],
    "title": "Current watches, warnings, and advisories for Maryland",
    "updated": "2026-10-23T20:26:59+00:00"
}
```
