## Welcome to Materialx Web

|||||
|:--:|:--:|:--:|:--:|
| <img src="https://raw.githubusercontent.com/kwokcb/materialxWeb/refs/heads/main/flask/gpuopen/images/extract_material_1.png" width=100%> | <img src="https://github.com/kwokcb/materialxWeb/blob/main/flask/converters/images/render_converter_2.png?raw=true" width=100%> | <img src="https://github.com/kwokcb/materialxWeb/raw/main/flask/ocio/images/ocio_mtlx_convert_1.png" width=100%> | <img src="https://github.com/kwokcb/materialxWeb/blob/main/nodejs/materialxLibraryInspector/public/images/ambientCg_download.png?raw=true" width=100%> |

This repository contains a set sample implementations demonstrate bi-directional communication between backends
using Python and NodeJS and front ends using Javascript .

The primary focus is on connection "open standards" such as `gltF`, `OCIO`, `OpenUSD` with `MaterialX`.

This is part of the set of tools available from <a href="https://kwokcb.github.io/MaterialXLab/" target="_blank">
<img src="https://kwokcb.github.io/MaterialXLab/documents/icons/teapot_logo.svg" width=32px>MaterialX Lab</a>

### Documentation

See the <a href="https://kwokcb.github.io/materialxWeb/index.html">h ome page</a> for more details.

### Python Flask Connector Examples

- [GPUOpen MaterialX Materials Inspector](./flask/gpuopen/README.md) : Download MaterialX materials from the AMD GPUOpen Materials Library and inspect contents of the materials.
- [glTF and USD Conversion from MaterialX](./flask/converters/README.md) : Convert a MaterialX document to a USD or glTF Texture Procedural document.
- [OCIO to MaterialX Definition Generation (Alpha)](./flask/ocio/README.md) : Use the OpenColorIO package to query for color space transforms and create MaterialX node definitions. There is support for source cde as well as nodegraph generation for transforms without LUTs.
- [Simple template example](./flask/template/README.md) : A simple "template" application that can be copied and modified as desired.

### NodeJS Express Examples

- [General MaterialX Library Inspecter](./nodejs/materialxLibraryInspector/README.md) : Common interface to access remove MaterialX material libraries such as `GPUOpen` and `AmbientCG`.
    - Sample deployment (*) is available <a href="https://materialx-materials-library-inspector.onrender.com/">here</a>. 

<hr>

### GitHub Repository

<a href="https://github.com/kwokcb/materialxWeb">materialXWeb</a>

### Building

See build instructions found <a href="https://github.com/kwokcb/materialxWeb/blob/main/utilities/README.md">here</a>.

<hr>
<sub>(*) Spin-up time is slow as this is a free tier deployment.</sub>
