import { describe, it, expect } from "vitest";
import {
  metersToFeet,
  feetToMeters,
  milesToKm,
  kmToMiles,
  inchesToCm,
  cmToInches,
  yardsToMeters,
  metersToYards,
  kgToLbs,
  lbsToKg,
  ozToGrams,
  gramsToOz,
  stoneToKg,
  kgToStone,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  celsiusToKelvin,
  kelvinToCelsius,
  fahrenheitToKelvin,
  mphToKmh,
  kmhToMph,
  msToKmh,
  kmhToMs,
  mphToMs,
  knotsToKmh,
  paceToSpeed,
  speedToPace,
  hoursToSeconds,
  minutesToSeconds,
  formatDuration,
  parseDurationToSeconds,
  secondsToHMS,
  convert,
  bytesToHuman,
  humanToBytes,
  roundTo,
  wattsToKcalPerHour,
  feetToYards,
  poundsForceToNewtons,
  caloriesToKilojoules,
  gForceToMs2,
} from "@/lib/utils/unit-conversion";

const T = 1e-9;

describe("length", () => {
  it("metersToFeet known value", () => {
    expect(metersToFeet(1)).toBeCloseTo(3.280839895, 6);
  });
  it("feetToMeters known value", () => {
    expect(feetToMeters(1)).toBeCloseTo(0.3048, 9);
  });
  it("metersToFeet zero", () => {
    expect(metersToFeet(0)).toBe(0);
  });
  it("feetToMeters zero", () => {
    expect(feetToMeters(0)).toBe(0);
  });
  it("m -> ft -> m roundtrip", () => {
    expect(feetToMeters(metersToFeet(123.456))).toBeCloseTo(123.456, 6);
  });
  it("ft -> m -> ft roundtrip", () => {
    expect(metersToFeet(feetToMeters(50))).toBeCloseTo(50, 6);
  });
  it("metersToFeet 100m", () => {
    expect(metersToFeet(100)).toBeCloseTo(328.0839895, 5);
  });
  it("milesToKm 1 mile", () => {
    expect(milesToKm(1)).toBeCloseTo(1.609344, 6);
  });
  it("kmToMiles 1 km", () => {
    expect(kmToMiles(1)).toBeCloseTo(0.621371192, 6);
  });
  it("mi -> km -> mi roundtrip", () => {
    expect(kmToMiles(milesToKm(26.2))).toBeCloseTo(26.2, 6);
  });
  it("km -> mi -> km roundtrip", () => {
    expect(milesToKm(kmToMiles(42.195))).toBeCloseTo(42.195, 6);
  });
  it("milesToKm zero", () => {
    expect(milesToKm(0)).toBe(0);
  });
  it("kmToMiles zero", () => {
    expect(kmToMiles(0)).toBe(0);
  });
  it("inchesToCm 1 inch", () => {
    expect(inchesToCm(1)).toBeCloseTo(2.54, 9);
  });
  it("cmToInches 2.54cm", () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 9);
  });
  it("inch -> cm -> inch roundtrip", () => {
    expect(cmToInches(inchesToCm(72))).toBeCloseTo(72, 6);
  });
  it("inchesToCm 12 inches", () => {
    expect(inchesToCm(12)).toBeCloseTo(30.48, 6);
  });
  it("inchesToCm zero", () => {
    expect(inchesToCm(0)).toBe(0);
  });
  it("yardsToMeters 1 yard", () => {
    expect(yardsToMeters(1)).toBeCloseTo(0.9144, 9);
  });
  it("metersToYards 0.9144m", () => {
    expect(metersToYards(0.9144)).toBeCloseTo(1, 9);
  });
  it("yd -> m -> yd roundtrip", () => {
    expect(metersToYards(yardsToMeters(100))).toBeCloseTo(100, 6);
  });
  it("m -> yd -> m roundtrip", () => {
    expect(yardsToMeters(metersToYards(91.44))).toBeCloseTo(91.44, 6);
  });
  it("yardsToMeters 100yd football field", () => {
    expect(yardsToMeters(100)).toBeCloseTo(91.44, 6);
  });
  it("yardsToMeters zero", () => {
    expect(yardsToMeters(0)).toBe(0);
  });
  it("negative meters to feet", () => {
    expect(metersToFeet(-1)).toBeCloseTo(-3.280839895, 6);
  });
});

describe("weight / mass", () => {
  it("kgToLbs 1 kg", () => {
    expect(kgToLbs(1)).toBeCloseTo(2.20462262, 6);
  });
  it("lbsToKg 1 lb", () => {
    expect(lbsToKg(1)).toBeCloseTo(0.45359237, 9);
  });
  it("kg -> lbs -> kg roundtrip", () => {
    expect(lbsToKg(kgToLbs(75))).toBeCloseTo(75, 6);
  });
  it("lbs -> kg -> lbs roundtrip", () => {
    expect(kgToLbs(lbsToKg(165))).toBeCloseTo(165, 6);
  });
  it("kgToLbs 100kg", () => {
    expect(kgToLbs(100)).toBeCloseTo(220.462262, 5);
  });
  it("kgToLbs zero", () => {
    expect(kgToLbs(0)).toBe(0);
  });
  it("lbsToKg zero", () => {
    expect(lbsToKg(0)).toBe(0);
  });
  it("ozToGrams 1 oz", () => {
    expect(ozToGrams(1)).toBeCloseTo(28.349523125, 6);
  });
  it("gramsToOz 28.349523125g", () => {
    expect(gramsToOz(28.349523125)).toBeCloseTo(1, 9);
  });
  it("oz -> g -> oz roundtrip", () => {
    expect(gramsToOz(ozToGrams(16))).toBeCloseTo(16, 6);
  });
  it("ozToGrams 16oz (1 lb)", () => {
    expect(ozToGrams(16)).toBeCloseTo(453.59237, 5);
  });
  it("ozToGrams zero", () => {
    expect(ozToGrams(0)).toBe(0);
  });
  it("stoneToKg 1 stone", () => {
    expect(stoneToKg(1)).toBeCloseTo(6.35029318, 6);
  });
  it("kgToStone 6.35029318kg", () => {
    expect(kgToStone(6.35029318)).toBeCloseTo(1, 9);
  });
  it("stone -> kg -> stone roundtrip", () => {
    expect(kgToStone(stoneToKg(12))).toBeCloseTo(12, 6);
  });
  it("stoneToKg 11 stone", () => {
    expect(stoneToKg(11)).toBeCloseTo(69.85322498, 5);
  });
  it("stoneToKg zero", () => {
    expect(stoneToKg(0)).toBe(0);
  });
  it("kgToStone zero", () => {
    expect(kgToStone(0)).toBe(0);
  });
});

describe("temperature", () => {
  it("0C = 32F", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });
  it("100C = 212F", () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });
  it("-40C = -40F", () => {
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });
  it("37C body temp", () => {
    expect(celsiusToFahrenheit(37)).toBeCloseTo(98.6, 6);
  });
  it("32F = 0C", () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
  });
  it("212F = 100C", () => {
    expect(fahrenheitToCelsius(212)).toBe(100);
  });
  it("-40F = -40C", () => {
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });
  it("C -> F -> C roundtrip", () => {
    expect(fahrenheitToCelsius(celsiusToFahrenheit(23.5))).toBeCloseTo(23.5, 9);
  });
  it("F -> C -> F roundtrip", () => {
    expect(celsiusToFahrenheit(fahrenheitToCelsius(72))).toBeCloseTo(72, 9);
  });
  it("0C = 273.15K", () => {
    expect(celsiusToKelvin(0)).toBeCloseTo(273.15, 9);
  });
  it("100C = 373.15K", () => {
    expect(celsiusToKelvin(100)).toBeCloseTo(373.15, 9);
  });
  it("-273.15C = 0K (absolute zero)", () => {
    expect(celsiusToKelvin(-273.15)).toBeCloseTo(0, 9);
  });
  it("273.15K = 0C", () => {
    expect(kelvinToCelsius(273.15)).toBeCloseTo(0, 9);
  });
  it("0K = -273.15C", () => {
    expect(kelvinToCelsius(0)).toBeCloseTo(-273.15, 9);
  });
  it("C -> K -> C roundtrip", () => {
    expect(kelvinToCelsius(celsiusToKelvin(15))).toBeCloseTo(15, 9);
  });
  it("32F = 273.15K", () => {
    expect(fahrenheitToKelvin(32)).toBeCloseTo(273.15, 9);
  });
  it("212F = 373.15K", () => {
    expect(fahrenheitToKelvin(212)).toBeCloseTo(373.15, 9);
  });
  it("fahrenheitToKelvin -40F", () => {
    expect(fahrenheitToKelvin(-40)).toBeCloseTo(233.15, 9);
  });
});

describe("speed", () => {
  it("60 mph ~= 96.56 kmh", () => {
    expect(mphToKmh(60)).toBeCloseTo(96.56064, 5);
  });
  it("mphToKmh 1", () => {
    expect(mphToKmh(1)).toBeCloseTo(1.609344, 6);
  });
  it("mphToKmh zero", () => {
    expect(mphToKmh(0)).toBe(0);
  });
  it("kmhToMph 100", () => {
    expect(kmhToMph(100)).toBeCloseTo(62.1371192, 6);
  });
  it("mph -> kmh -> mph roundtrip", () => {
    expect(kmhToMph(mphToKmh(55))).toBeCloseTo(55, 6);
  });
  it("msToKmh 1", () => {
    expect(msToKmh(1)).toBeCloseTo(3.6, 9);
  });
  it("msToKmh 10 (sprint)", () => {
    expect(msToKmh(10)).toBeCloseTo(36, 9);
  });
  it("msToKmh zero", () => {
    expect(msToKmh(0)).toBe(0);
  });
  it("kmhToMs 3.6", () => {
    expect(kmhToMs(3.6)).toBeCloseTo(1, 9);
  });
  it("ms -> kmh -> ms roundtrip", () => {
    expect(kmhToMs(msToKmh(8.5))).toBeCloseTo(8.5, 9);
  });
  it("mphToMs 60", () => {
    expect(mphToMs(60)).toBeCloseTo(26.8224, 6);
  });
  it("mphToMs zero", () => {
    expect(mphToMs(0)).toBe(0);
  });
  it("knotsToKmh 1", () => {
    expect(knotsToKmh(1)).toBeCloseTo(1.852, 9);
  });
  it("knotsToKmh 10", () => {
    expect(knotsToKmh(10)).toBeCloseTo(18.52, 6);
  });
  it("knotsToKmh zero", () => {
    expect(knotsToKmh(0)).toBe(0);
  });
  it("paceToSpeed 300 s/km = 12 km/h", () => {
    expect(paceToSpeed(300)).toBeCloseTo(12, 9);
  });
  it("paceToSpeed 360 s/km = 10 km/h", () => {
    expect(paceToSpeed(360)).toBeCloseTo(10, 9);
  });
  it("paceToSpeed 0 -> 0", () => {
    expect(paceToSpeed(0)).toBe(0);
  });
  it("speedToPace 12 km/h = 300 s/km", () => {
    expect(speedToPace(12)).toBeCloseTo(300, 9);
  });
  it("speedToPace 10 km/h = 360 s/km", () => {
    expect(speedToPace(10)).toBeCloseTo(360, 9);
  });
  it("speedToPace 0 -> Infinity", () => {
    expect(speedToPace(0)).toBe(Infinity);
  });
  it("paceToSpeed / speedToPace are inverse", () => {
    expect(speedToPace(paceToSpeed(285))).toBeCloseTo(285, 6);
  });
  it("speedToPace / paceToSpeed are inverse", () => {
    expect(paceToSpeed(speedToPace(11.3))).toBeCloseTo(11.3, 6);
  });
});

describe("time & duration", () => {
  it("hoursToSeconds 1", () => {
    expect(hoursToSeconds(1)).toBe(3600);
  });
  it("hoursToSeconds 2.5", () => {
    expect(hoursToSeconds(2.5)).toBe(9000);
  });
  it("hoursToSeconds 0", () => {
    expect(hoursToSeconds(0)).toBe(0);
  });
  it("minutesToSeconds 1", () => {
    expect(minutesToSeconds(1)).toBe(60);
  });
  it("minutesToSeconds 90", () => {
    expect(minutesToSeconds(90)).toBe(5400);
  });
  it("minutesToSeconds 0", () => {
    expect(minutesToSeconds(0)).toBe(0);
  });
  it("formatDuration with hours 5025 -> 1:23:45", () => {
    expect(formatDuration(5025)).toBe("1:23:45");
  });
  it("formatDuration without hours 1425 -> 23:45", () => {
    expect(formatDuration(1425)).toBe("23:45");
  });
  it("formatDuration 0 -> 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
  it("formatDuration 59 -> 0:59", () => {
    expect(formatDuration(59)).toBe("0:59");
  });
  it("formatDuration 60 -> 1:00", () => {
    expect(formatDuration(60)).toBe("1:00");
  });
  it("formatDuration 3600 -> 1:00:00", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
  });
  it("formatDuration 3661 -> 1:01:01", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });
  it("formatDuration pads minutes when hours present", () => {
    expect(formatDuration(3605)).toBe("1:00:05");
  });
  it("formatDuration floors fractional seconds", () => {
    expect(formatDuration(125.9)).toBe("2:05");
  });
  it("formatDuration negative", () => {
    expect(formatDuration(-65)).toBe("-1:05");
  });
  it("formatDuration non-finite -> 0:00", () => {
    expect(formatDuration(Infinity)).toBe("0:00");
  });
  it("parseDurationToSeconds h:mm:ss", () => {
    expect(parseDurationToSeconds("1:23:45")).toBe(5025);
  });
  it("parseDurationToSeconds mm:ss", () => {
    expect(parseDurationToSeconds("23:45")).toBe(1425);
  });
  it("parseDurationToSeconds 0:00", () => {
    expect(parseDurationToSeconds("0:00")).toBe(0);
  });
  it("parseDurationToSeconds 1:00:00", () => {
    expect(parseDurationToSeconds("1:00:00")).toBe(3600);
  });
  it("parseDurationToSeconds trims whitespace", () => {
    expect(parseDurationToSeconds("  2:30  ")).toBe(150);
  });
  it("parseDurationToSeconds negative", () => {
    expect(parseDurationToSeconds("-1:05")).toBe(-65);
  });
  it("parseDurationToSeconds invalid letters -> 0", () => {
    expect(parseDurationToSeconds("abc")).toBe(0);
  });
  it("parseDurationToSeconds empty -> 0", () => {
    expect(parseDurationToSeconds("")).toBe(0);
  });
  it("parseDurationToSeconds single number -> 0", () => {
    expect(parseDurationToSeconds("45")).toBe(0);
  });
  it("parseDurationToSeconds too many parts -> 0", () => {
    expect(parseDurationToSeconds("1:2:3:4")).toBe(0);
  });
  it("parseDurationToSeconds mixed letters -> 0", () => {
    expect(parseDurationToSeconds("1:2x")).toBe(0);
  });
  it("formatDuration / parse roundtrip mm:ss", () => {
    expect(parseDurationToSeconds(formatDuration(1425))).toBe(1425);
  });
  it("formatDuration / parse roundtrip h:mm:ss", () => {
    expect(parseDurationToSeconds(formatDuration(5025))).toBe(5025);
  });
  it("secondsToHMS 5025", () => {
    expect(secondsToHMS(5025)).toEqual({ hours: 1, minutes: 23, seconds: 45 });
  });
  it("secondsToHMS 1425", () => {
    expect(secondsToHMS(1425)).toEqual({ hours: 0, minutes: 23, seconds: 45 });
  });
  it("secondsToHMS 0", () => {
    expect(secondsToHMS(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });
  it("secondsToHMS 59", () => {
    expect(secondsToHMS(59)).toEqual({ hours: 0, minutes: 0, seconds: 59 });
  });
  it("secondsToHMS 3600", () => {
    expect(secondsToHMS(3600)).toEqual({ hours: 1, minutes: 0, seconds: 0 });
  });
  it("secondsToHMS floors fractional", () => {
    expect(secondsToHMS(125.7)).toEqual({ hours: 0, minutes: 2, seconds: 5 });
  });
});

describe("generic convert()", () => {
  it("length m -> ft", () => {
    expect(convert(1, "m", "ft")).toBeCloseTo(3.280839895, 6);
  });
  it("length ft -> m", () => {
    expect(convert(3.280839895, "ft", "m")).toBeCloseTo(1, 6);
  });
  it("length km -> mi", () => {
    expect(convert(1, "km", "mi")).toBeCloseTo(0.621371192, 6);
  });
  it("length mi -> km", () => {
    expect(convert(1, "mi", "km")).toBeCloseTo(1.609344, 6);
  });
  it("length cm -> in", () => {
    expect(convert(2.54, "cm", "in")).toBeCloseTo(1, 6);
  });
  it("length yd -> m", () => {
    expect(convert(1, "yd", "m")).toBeCloseTo(0.9144, 6);
  });
  it("length mm -> m", () => {
    expect(convert(1000, "mm", "m")).toBeCloseTo(1, 6);
  });
  it("length is case-insensitive", () => {
    expect(convert(1, "KM", "M")).toBeCloseTo(1000, 6);
  });
  it("length tolerates whitespace", () => {
    expect(convert(1, " km ", " m ")).toBeCloseTo(1000, 6);
  });
  it("length alias meters/feet", () => {
    expect(convert(1, "meters", "feet")).toBeCloseTo(3.280839895, 6);
  });
  it("mass kg -> lbs", () => {
    expect(convert(1, "kg", "lbs")).toBeCloseTo(2.20462262, 6);
  });
  it("mass lb -> kg", () => {
    expect(convert(1, "lb", "kg")).toBeCloseTo(0.45359237, 6);
  });
  it("mass g -> kg", () => {
    expect(convert(1000, "g", "kg")).toBeCloseTo(1, 6);
  });
  it("mass oz -> g", () => {
    expect(convert(1, "oz", "g")).toBeCloseTo(28.349523125, 6);
  });
  it("mass stone -> kg", () => {
    expect(convert(1, "stone", "kg")).toBeCloseTo(6.35029318, 6);
  });
  it("speed m/s -> km/h", () => {
    expect(convert(1, "m/s", "km/h")).toBeCloseTo(3.6, 6);
  });
  it("speed mph -> km/h", () => {
    expect(convert(60, "mph", "km/h")).toBeCloseTo(96.56064, 5);
  });
  it("speed km/h -> mph", () => {
    expect(convert(100, "km/h", "mph")).toBeCloseTo(62.1371192, 5);
  });
  it("speed knots -> km/h", () => {
    expect(convert(10, "knots", "km/h")).toBeCloseTo(18.52, 5);
  });
  it("speed mph -> m/s", () => {
    expect(convert(60, "mph", "m/s")).toBeCloseTo(26.8224, 5);
  });
  it("temperature C -> F special-case (0 -> 32)", () => {
    expect(convert(0, "c", "f")).toBeCloseTo(32, 9);
  });
  it("temperature C -> F (100 -> 212)", () => {
    expect(convert(100, "celsius", "fahrenheit")).toBeCloseTo(212, 9);
  });
  it("temperature F -> C (32 -> 0)", () => {
    expect(convert(32, "f", "c")).toBeCloseTo(0, 9);
  });
  it("temperature C -> K (0 -> 273.15)", () => {
    expect(convert(0, "c", "k")).toBeCloseTo(273.15, 9);
  });
  it("temperature K -> C (273.15 -> 0)", () => {
    expect(convert(273.15, "k", "c")).toBeCloseTo(0, 9);
  });
  it("temperature F -> K (32 -> 273.15)", () => {
    expect(convert(32, "f", "k")).toBeCloseTo(273.15, 9);
  });
  it("temperature same unit identity", () => {
    expect(convert(25, "c", "c")).toBeCloseTo(25, 9);
  });
  it("incompatible kg -> m -> NaN", () => {
    expect(convert(1, "kg", "m")).toBeNaN();
  });
  it("incompatible c -> m -> NaN", () => {
    expect(convert(1, "c", "m")).toBeNaN();
  });
  it("incompatible km/h -> kg -> NaN", () => {
    expect(convert(1, "km/h", "kg")).toBeNaN();
  });
  it("unknown from unit -> NaN", () => {
    expect(convert(1, "bogus", "m")).toBeNaN();
  });
  it("unknown to unit -> NaN", () => {
    expect(convert(1, "m", "bogus")).toBeNaN();
  });
  it("both unknown -> NaN", () => {
    expect(convert(1, "x", "y")).toBeNaN();
  });
  it("temperature -> non-temperature -> NaN", () => {
    expect(convert(1, "c", "kg")).toBeNaN();
  });
  it("convert preserves identity within length", () => {
    expect(convert(42, "m", "m")).toBeCloseTo(42, 9);
  });
  it("convert zero value length", () => {
    expect(convert(0, "m", "ft")).toBe(0);
  });
});

describe("bytesToHuman", () => {
  it("0 bytes", () => {
    expect(bytesToHuman(0)).toBe("0 B");
  });
  it("512 bytes binary", () => {
    expect(bytesToHuman(512)).toBe("512 B");
  });
  it("1024 -> 1 KiB binary (default)", () => {
    expect(bytesToHuman(1024)).toBe("1 KiB");
  });
  it("1536 -> 1.5 KiB binary", () => {
    expect(bytesToHuman(1536)).toBe("1.5 KiB");
  });
  it("1048576 -> 1 MiB binary", () => {
    expect(bytesToHuman(1048576)).toBe("1 MiB");
  });
  it("1073741824 -> 1 GiB binary", () => {
    expect(bytesToHuman(1073741824)).toBe("1 GiB");
  });
  it("1000 -> 1 KB decimal", () => {
    expect(bytesToHuman(1000, false)).toBe("1 KB");
  });
  it("1500 -> 1.5 KB decimal", () => {
    expect(bytesToHuman(1500, false)).toBe("1.5 KB");
  });
  it("1000000 -> 1 MB decimal", () => {
    expect(bytesToHuman(1000000, false)).toBe("1 MB");
  });
  it("1000000000 -> 1 GB decimal", () => {
    expect(bytesToHuman(1000000000, false)).toBe("1 GB");
  });
  it("1000 binary stays B-scale not KB", () => {
    expect(bytesToHuman(1000)).toBe("1000 B");
  });
  it("negative bytes binary", () => {
    expect(bytesToHuman(-2048)).toBe("-2 KiB");
  });
  it("non-finite -> 0 B", () => {
    expect(bytesToHuman(Infinity)).toBe("0 B");
  });
  it("large terabyte binary", () => {
    expect(bytesToHuman(1024 ** 4)).toBe("1 TiB");
  });
  it("rounds to 2 decimals", () => {
    expect(bytesToHuman(1234567)).toBe("1.18 MiB");
  });
});

describe("humanToBytes", () => {
  it("bare number -> bytes", () => {
    expect(humanToBytes("500")).toBe(500);
  });
  it("explicit B", () => {
    expect(humanToBytes("512 B")).toBe(512);
  });
  it("1 KiB", () => {
    expect(humanToBytes("1 KiB")).toBe(1024);
  });
  it("1.5 MiB", () => {
    expect(humanToBytes("1.5 MiB")).toBe(1.5 * 1024 ** 2);
  });
  it("2 GiB", () => {
    expect(humanToBytes("2 GiB")).toBe(2 * 1024 ** 3);
  });
  it("1 KB decimal", () => {
    expect(humanToBytes("1 KB")).toBe(1000);
  });
  it("2GB no space decimal", () => {
    expect(humanToBytes("2GB")).toBe(2 * 1000 ** 3);
  });
  it("case-insensitive mib", () => {
    expect(humanToBytes("1 mib")).toBe(1024 ** 2);
  });
  it("trims whitespace", () => {
    expect(humanToBytes("  3 KB  ")).toBe(3000);
  });
  it("k shorthand decimal", () => {
    expect(humanToBytes("5k")).toBe(5000);
  });
  it("invalid -> 0", () => {
    expect(humanToBytes("not a size")).toBe(0);
  });
  it("empty -> 0", () => {
    expect(humanToBytes("")).toBe(0);
  });
  it("unknown unit -> 0", () => {
    expect(humanToBytes("5 zibibytes")).toBe(0);
  });
  it("roundtrip with bytesToHuman binary", () => {
    expect(humanToBytes(bytesToHuman(2048))).toBe(2048);
  });
  it("negative", () => {
    expect(humanToBytes("-1 KiB")).toBe(-1024);
  });
});

describe("roundTo", () => {
  it("2 decimals", () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
  });
  it("0 decimals", () => {
    expect(roundTo(3.7, 0)).toBe(4);
  });
  it("4 decimals", () => {
    expect(roundTo(2.718281828, 4)).toBe(2.7183);
  });
  it("rounds half up", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
  });
  it("negative value", () => {
    // Math.round ties go toward +Infinity, so -2.345 -> -2.34.
    expect(roundTo(-2.345, 2)).toBe(-2.34);
  });
  it("negative value clear (no tie)", () => {
    expect(roundTo(-2.346, 2)).toBe(-2.35);
  });
  it("zero", () => {
    expect(roundTo(0, 5)).toBe(0);
  });
  it("integer unchanged", () => {
    expect(roundTo(42, 2)).toBe(42);
  });
  it("negative decimals clamped to 0", () => {
    expect(roundTo(3.7, -1)).toBe(4);
  });
  it("non-finite passthrough", () => {
    expect(roundTo(Infinity, 2)).toBe(Infinity);
  });
  it("NaN passthrough", () => {
    expect(roundTo(NaN, 2)).toBeNaN();
  });
});

describe("sports-specific", () => {
  it("wattsToKcalPerHour 250W", () => {
    expect(wattsToKcalPerHour(250)).toBeCloseTo(215, 6);
  });
  it("wattsToKcalPerHour 100W", () => {
    expect(wattsToKcalPerHour(100)).toBeCloseTo(86, 6);
  });
  it("wattsToKcalPerHour 0", () => {
    expect(wattsToKcalPerHour(0)).toBe(0);
  });
  it("feetToYards 3ft = 1yd", () => {
    expect(feetToYards(3)).toBeCloseTo(1, 9);
  });
  it("feetToYards 30ft = 10yd", () => {
    expect(feetToYards(30)).toBeCloseTo(10, 9);
  });
  it("feetToYards 0", () => {
    expect(feetToYards(0)).toBe(0);
  });
  it("poundsForceToNewtons 1 lbf", () => {
    expect(poundsForceToNewtons(1)).toBeCloseTo(4.4482216152605, 9);
  });
  it("poundsForceToNewtons 100 lbf", () => {
    expect(poundsForceToNewtons(100)).toBeCloseTo(444.82216152605, 6);
  });
  it("poundsForceToNewtons 0", () => {
    expect(poundsForceToNewtons(0)).toBe(0);
  });
  it("caloriesToKilojoules 1000 cal", () => {
    expect(caloriesToKilojoules(1000)).toBeCloseTo(4.184, 9);
  });
  it("caloriesToKilojoules 500 cal", () => {
    expect(caloriesToKilojoules(500)).toBeCloseTo(2.092, 9);
  });
  it("caloriesToKilojoules 0", () => {
    expect(caloriesToKilojoules(0)).toBe(0);
  });
  it("gForceToMs2 1g = standard gravity", () => {
    expect(gForceToMs2(1)).toBeCloseTo(9.80665, 9);
  });
  it("gForceToMs2 5g", () => {
    expect(gForceToMs2(5)).toBeCloseTo(49.03325, 6);
  });
  it("gForceToMs2 0", () => {
    expect(gForceToMs2(0)).toBe(0);
  });
  it("gForceToMs2 negative", () => {
    expect(gForceToMs2(-2)).toBeCloseTo(-19.6133, 6);
  });
});

describe("tolerance sanity", () => {
  it("metersToFeet within tolerance T", () => {
    expect(Math.abs(metersToFeet(1) - 3.280839895013123)).toBeLessThan(T);
  });
  it("kgToLbs within tolerance T", () => {
    expect(Math.abs(lbsToKg(kgToLbs(10)) - 10)).toBeLessThan(T);
  });
});
