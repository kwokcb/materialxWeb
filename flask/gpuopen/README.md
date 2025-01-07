## GPUOpen Material Inspector

This sample package shows the basic components required to connect MaterialX running in Python to a Web client running Javascript in order to access materials on the <a href="https://matlib.gpuopen.com/main/materials/all">AMD GPUOpen material site</a>.

<img src="./images/extract_material_1.png" alt="Sample extracted material" width="100%">

### Dependents
- Usage of the `materialxMaterials` Python package
- `flask` and `flask-socketio` Python packages
- `socket-io` Javascript library

### Installation

Either install the package from `PyPi`:

```
pip install materialx_gpuopen_app
```

or clone the <a href="https://github.com/kwokcb/materialxWeb">materialXWeb</a>  
repository and install from the root folder:

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
materialx-gpuopen-app
```
or directly with Python:
```
python MaterialXGPUOpenApp.p
```

By default the application is running a local server. To access the client page open the following in a Web browser:
```
http://127.0.0.1:5000
```



