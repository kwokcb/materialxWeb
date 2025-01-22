## Materialx Conversion Application

This sample package shows the basic components required to connect MaterialX running in Python to a Web client running Javascript in order to run conversion or rendering applications.

<table>
<tr>
<td><img src="https://github.com/kwokcb/materialxWeb/blob/main/flask/converters/images/converter_render.png?raw=true" width=100%>
Server-side rendering using <b>MaterialXView</b></td>
<td><img src="https://github.com/kwokcb/materialxWeb/blob/main/flask/converters/images/converter_usd_gltf_.png?raw=true" width=100%>
Server-side conversion from MaterialX to USD and glTF (top and
bottom respectively) 
</td>
</tr>
</table>

### Dependents

The following packages are installed by default as part of the `pip` installation. 

- `flask` and `flask-socketio`: Python packages for Flask support
- `socket-io`: For Javascript WebSocket support
- `usd-core`: for OpenUSD conversion. Different versions can be downloaded 
explicitly from <a href="https://pypi.org/project/usd-core/" target="_blank">PyPi</a>. The assumed minimum version is 24.11.
- `MaterialX` : Different versions can be downloaded explicitly from <a href="https://pypi.org/project/MaterialX/" target="_blank">PyPi</a>. The assumed minimum version is 1.38.10.

- `gltf_materialx_converter`: `MaterialX glTF Convertor` Python library. Note that this is not available on `PyPi` currently so the <a href="https://github.com/KhronosGroup/glTF-MaterialX-Converter" target="_blank">Github repository</a> must be cloned and the packagelocally installed.

Rendering depends on the environment variable: `MATERIALX_DEFAULT_VIEWER` being set to the location of the MaterialXView binary. This is part of the MaterialX release distribution as found <a href="https://github.com/AcademySoftwareFoundation/MaterialX/releases" target="_blank">here</a>

### Installation

Either install the package from `PyPi`:

```
pip install materialx_conversion_app
```

or clone the <a href="https://github.com/kwokcb/materialxWeb">materialXWeb</a> repository and install from the root folder:

```
pip install .
```

or 

```
pip install -e .
```
if planning to perform edits on the repository.

### Execution

Run the main package using:
```
materialx_conversion_app
```
or directly with Python:
```
python MaterialXConversionApp.py
```

By default the application is running a local server. To access the client page open the following in a Web browser:
```
http://127.0.0.1:8000
```



