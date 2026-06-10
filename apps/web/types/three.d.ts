// TODO: three@0.184.0 ships no bundled types and @types/three is not installed; no source imports "three" yet, so this broad shim is kept to keep module resolution safe. Replace with `@types/three` (or specific named declarations) once "three" is actually imported.
declare module "three";
