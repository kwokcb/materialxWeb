# Welcome to Materialx Web

This repository contains a set sample implementations that show bi-directional communication between Python and Javascript logic.

The main focus is on connection "open standards" such as `gltF`, `OCIO`, `OpenUSD` with `MaterialX`.

This is part of the set of tools available from <a href="https://kwokcb.github.io/MaterialXLab/" target="_blank">
<img src="https://kwokcb.github.io/MaterialXLab/documents/icons/teapot_logo.svg" width=32px>MaterialX Lab</a>

## Documentation

See the <a href="https://kwokcb.github.io/materialxWeb/index.html">home page</a> for more details.

## Python Flask Connector Examples

- [GPUOpen MaterialX Materials Inspector](./flask/gpuopen/README.md) : Download MaterialX materials from the AMD GPUOpen Materials Library and inspect contents of the materials.
- [glTF and USD Conversion from MaterialX](./flask/converters/README.md) : Convert a MaterialX document to a USD or glTF Texture Procedural document.
- [OCIO to MaterialX Definition Generation (Alpha)](./flask/ocio/README.md) : Use the OpenColorIO package to query for color space transforms and create MaterialX node definitions.
- [Simple template example](./flask/template/README.md) : A simple "template" application that can be copied and modified as desired.

## NodeJS Express Examples

- [General MaterialX Library Inspecter](./nodejs/materialxLibraryInspector/README.md) : Common interface to access remove MaterialX material libraries such as `GPUOpen` and `AmbientCG`.

<hr>

See build instructions found <a href="https://github.com/kwokcb/materialxWeb/blob/main/utilities/README.md">here</a>.

## GitHub Repository

<a href="https://github.com/kwokcb/materialxWeb">materialXWeb</a>
