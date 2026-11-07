# Bundled compression dependency

`fflate.js` is `fflate` **0.8.2**, `esm/browser.js`, from the published npm tarball:
https://registry.npmjs.org/fflate/-/fflate-0.8.2.tgz

Upstream source/release: https://github.com/101arrowz/fflate/tree/v0.8.2

The bundled file has only a provenance comment prepended. No functional edits.
The MIT license is retained in `fflate.LICENSE`. The game uses synchronous
zlib compression, decompression, and UTF-8 conversion; it does not fetch a CDN
or create compression workers at runtime.
