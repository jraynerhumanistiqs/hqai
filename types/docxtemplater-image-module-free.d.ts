// Ambient type declaration for docxtemplater-image-module-free.
//
// The package ships as plain JavaScript with no bundled .d.ts, so TypeScript
// cannot resolve its types. It is imported as a default export in
// lib/render/docx-templates.ts (the OPTION F branded-logo renderer) and
// constructed with an options object, then passed to Docxtemplater's module
// system. We only need it to type-check as an opaque module here.
declare module 'docxtemplater-image-module-free' {
  const ImageModule: any
  export default ImageModule
}
