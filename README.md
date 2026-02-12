## Welcome to Materialx Web

|||||
|:--:|:--:|:--:|:--:|
| <img src="https://github.com/kwokcb/materialxWeb/blob/main/nodejs/materialxLibraryInspector/public/images/ambientCg_download_3.png?raw=true" width=100%> AmbientCg Express App | <img src="https://github.com/kwokcb/materialxWeb/raw/main/flask/ocio/images/ocio_mtlx_convert_1.png" width=100%> OCIO MaterialX builder | <img src="https://raw.githubusercontent.com/kwokcb/materialxWeb/refs/heads/main/flask/gpuopen/images/GPUOpen_Flask.png" width=100%> GPUOpen Flask App| <img src="https://github.com/kwokcb/materialxWeb/blob/main/flask/converters/images/render_converter_2.png?raw=true" width=100%> Backend: rendering, glTF and USD conversions |

This repository contains a set interactive utilities to serve and manipulate MaterialX content using `Flask` / `Python` or `Express` / `NodeJS` back-ends communicating with Web (`Javascript`) front-ends.

The requirement for backends is due to two main factors:
1. The backend libraries are only available in C++ or Python, and not in JavaScript. This includes libraries such as `OpenColorIO` and `OpenUSD` (this requires manual
building at time of writing).
2. Many remote servers hosting MaterialX content do not have CORS (Cross-Origin Resource Sharing) enabled, which prevents direct access from JavaScript in the browser. The backend acts as a proxy, fetching this data from the remote servers and passing it to the front-end.

These utilities are part <a href="https://kwokcb.github.io/MaterialXLab/" target="_blank"><img src="https://kwokcb.github.io/MaterialXLab/documents/icons/teapot_logo.svg" width=24px>MaterialX Lab</a>

### Documentation

See the <a href="https://kwokcb.github.io/materialxWeb/index.html">home page</a> for more details.

### Python Flask Connector Examples

- [GPUOpen MaterialX Materials Inspector](./flask/gpuopen/README.md) : Examine and download MaterialX materials from the AMD GPUOpen Material library.
- [glTF and USD Conversion from MaterialX](./flask/converters/README.md) : Convert a MaterialX document to a USD or glTF Texture Procedural document.
- [OCIO to MaterialX Definition Generation (Alpha)](./flask/ocio/README.md) : Use the OpenColorIO package to query for color space transforms and create MaterialX node definitions in the form of source code as well as MaterialX shader graphs.
- [Simple template example](./flask/template/README.md) : A simple "template" application that can be copied and modified as desired.

### NodeJS Express Examples

- [General MaterialX Library Inspecter](./nodejs/materialxLibraryInspector/README.md) : Common interface to access remote MaterialX material libraries such as `GPUOpen` and `AmbientCG`.
    - Sample deployment (*) is available <a href="https://materialx-materials-library-inspector.onrender.com/">here</a>. 

<hr>

### GitHub Repository

<a href="https://github.com/kwokcb/materialxWeb">materialXWeb</a>

### Building

See build instructions found <a href="https://github.com/kwokcb/materialxWeb/blob/main/utilities/README.md">here</a>.

<hr>
<sub>(*) Spin-up time may be slow as this is a free tier deployment.</sub>
