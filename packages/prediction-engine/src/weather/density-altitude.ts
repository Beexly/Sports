
/** Pressure altitude (ft) from altimeter setting and field elevation. */
export function pressureAltitude(elevationFt: number, altimeterInHg: number): number {
  return elevationFt + (29.92 - altimeterInHg) * 1000;
}

/** ISA temperature (C) at a pressure altitude. */
export function isaTempC(pressureAltFt: number): number {
  return 15 - 0.0019812 * pressureAltFt;
}

/**
 * Density altitude (ft): PA + 120 * (OAT - ISA_temp).
 * Standard pilot approximation.
 */
export function densityAltitude(elevationFt: number, altimeterInHg: number, tempC: number): number {
  const pa = pressureAltitude(elevationFt, altimeterInHg);
  return pa + 120 * (tempC - isaTempC(pa));
}

/** Air density (kg/m^3) from pressure altitude and temperature. */
export function airDensityKgM3(pressureAltFt: number, tempC: number): number {
  const pPa = 101325 * Math.pow(1 - (0.0065 * pressureAltFt * 0.3048) / 288.15, 5.255);
  const tK = tempC + 273.15;
  return pPa / (287.05 * tK);
}

/** Air-density ratio vs the sea-level standard (1.225 kg/m^3). */
export function airDensityRatio(elevationFt: number, altimeterInHg: number, tempC: number): number {
  const pa = pressureAltitude(elevationFt, altimeterInHg);
  return airDensityKgM3(pa, tempC) / 1.225;
}

/** Drag scaling factor for carry distance models: drag ~ rho. */
export function dragScaling(elevationFt: number, altimeterInHg: number, tempC: number): number {
  return airDensityRatio(elevationFt, altimeterInHg, tempC);
}
