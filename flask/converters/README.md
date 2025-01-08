## Materialx Convertors

This sample package shows the basic components required to connect MaterialX running in Python to a Web client running Javascript in order to run conversion or rendering applications.

### Dependents
- `flask` and `flask-socketio`: Python packages for Flask support
- `socket-io`: For Javascript WebSocket support
- `usd-core`: for OpenUSD conversion
- `gltf_materialx_converter`: `MaterialX glTF Convertor` Python library. Note that this is not available on `PyPi` currently so the package
must be locally installed.

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



