# Welcome to materialxWeb

This repository contains a set sample implementations that show bi-directional communication between Python and Javascript logic.

The main focus is on connection "open standards" such as `gltF`, `OCIO`, `OpenUSD` with `MaterialX`.

## Documentation

See the <a href="https://kwokcb.github.io/materialxWeb/index.html">home page</a> for more details.

## Flask Connector Examples

- [GPUOpen MaterialX Materials Inspector](./flask/gpuopen/README.md) : Download MaterialX materials from the AMD GPUOpen Materials Library and inspect contents of the materials.
- [glTF and USD Conversion from MaterialX](./flask/converters/README.md) : Convert a MaterialX document to a USD or glTF Texture Procedural document.
- [OCIO to MaterialX Definition Generation (Alpha)](./flask/ocio/README.md) : Use the OpenColorIO package to query for color space transforms and create MaterialX node definitions.
- [Simple template example](./flask/template/README.md) : A simple "template" application that can be copied and modified as desired.

See build instructions found in [utilities](utilities/README.md).
