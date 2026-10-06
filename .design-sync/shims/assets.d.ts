// design-sync shim typing: the converter's esbuild config loads .png/.svg as data URIs.
declare module "*.png" {
  const dataUrl: string;
  export default dataUrl;
}
declare module "*.svg" {
  const dataUrl: string;
  export default dataUrl;
}
