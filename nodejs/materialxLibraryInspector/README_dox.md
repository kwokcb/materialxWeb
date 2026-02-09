## NodeJs MaterialX Library Inspector

Application to examine MaterialX based materials from various publish libraries.
This inclides AMD GPU open, and AmbientCG currently.

Below are some sample materials packages that can be previewed and or downloaded as 
zip files. Note that any non MaterialX or non iage files (such as OpenUSD (usdc) files from AmbientCG) are not displayed in previews but are part of downloaded packages.

Note that some packages may take some time to download / preview due to the time it takes to download large flles (e.g. 8K images) 

| Package | Download |
| :--: | :--: |
| AmbientCG Tile |  <img src="https://github.com/kwokcb/materialxWeb/blob/main/nodejs/materialxLibraryInspector/public/images/ambientCg_download_3.png?raw=true" width=100%> |
| GPUOpen  |  <img src="https://github.com/kwokcb/materialxWeb/blob/main/nodejs/materialxLibraryInspector/public/images/gpuOpen_download_1.png?raw=true" width=100%> |

Below is an example of hosting on <a href="https://render.com/">Render</a>

<img src="https://github.com/kwokcb/materialxWeb/blob/main/nodejs/materialxLibraryInspector/public/images/hosting_on_render_1.png?raw=true" width=100%>

## Architecture Overview

The package is built using `NodeJs` and `Express` for the server, and JavaScript for the client. The server serves static files from the `public` directory, and also provides API endpoints to fetch material data and download material packages (Zip files) containing MaterialX files and associated assets. 

### Fetching Material Lists

The client fetches material lists from the server and displays it on a web page. 

The server uses two loader classes, `JsAmbientCGLoader` and `JsGPUOpenMaterialLoader`, to handle the fetching and processing of material data (in JSON form) from the AmbientCG and GPUOpen sites respectively. 

The client uses this data to display material previews and provide download links for the material packages.

For `AmbientCG` both a download list as well as full material "database" is fetched. The latter is to retrieve metadata such as author, description, preview images etc.

<pre><code class="language-mermaid"><div class="mermaid">
flowchart LR
	subgraph Client
		A[main.js]
		A -->|fetch /api/materials| B[Express Server]
		A -->|fetch /api/downloadAmbientCGPackage| B
		A -->|fetch /api/downloadGPUOpenPackage| B
		A -->|render material list| I[displayAmbientCGMaterials / displayGPUOpenMaterials]
		A -->|unpack/display ZIP| J[displayMaterialPackage]
		I -->|update DOM| K[materialsContainer]
		J -->|show images, MaterialX| L[extracted_images, extracted_mtlx]
	end
	subgraph Server
		B[materialServer.cjs]
		B -->|require| C[JsAmbientCGLoader.js]
		B -->|require| D[JsGPUOpenMaterialLoader.js]
	end
	subgraph Data
		E[ambientcg_database.json]
		F[ambientcg_materials.json]
		G[gpuopen_materials.json]
	end
	C --> E
	C --> F
	D --> G
	B -->|serves static| H[public/]
	H -->|main.js, index.html, images| Client

</div></code></pre>

### Material Fetch/Download Logic

The sequence diagram below illustrates the interactions between the browser, server, and loader classes when fetching material lists and downloading material packages (ZIP). 

ZIP data is unpacked on the client side to display `MaterialX` document content and dependent images.

<pre><code class="language-mermaid"><div class="mermaid">
sequenceDiagram
participant Browser
participant Server
participant AmbientCg_Loader
participant GPUOpenLoader
participant DOM
Browser->>Server: GET /api/materials?source="AmbientCGLoader"
Server->>AmbientCg_Loader: downloadMaterialsList()
AmbientCg_Loader-->>Server: [materials JSON]
Server-->>Browser: [materials JSON]
Browser->>DOM: displayAmbientCGMaterials
Browser->>Server: GET /api/downloadAmbientCGPackage
Server->>AmbientCg_Loader: downloadMaterialAsset
AmbientCg_Loader-->>Server: [zip data]
Server-->>Browser: [zip data]
Browser->>DOM: displayMaterialPackage - unpack ZIP, show images, MaterialX
Browser->>Server: GET /api/materials?source="GPUOpen"
Server->>GPUOpenLoader: getMaterials
GPUOpenLoader-->>Server: [materials JSON]
Server-->>Browser: [materials JSON]
Browser->>DOM: displayGPUOpenMaterials
Browser->>Server: GET /api/downloadGPUOpenPackage
Server->>GPUOpenLoader: downloadPackage
GPUOpenLoader-->>Server: [zip data]
Server-->>Browser: [zip data]
Browser->>DOM: displayMaterialPackage - unpack ZIP, show images, MaterialX

</div></code></pre>

### Loader Class Dependencies

The package dependencies for the loader classes `AmbientCgLoader` and `JsGPUOpenMaterialLoader` are shown below.

<pre><code class="language-mermaid"><div class="mermaid">
flowchart TD
	subgraph Loader Classes
		A[JsAmbientCGLoader.js]
		B[JsGPUOpenMaterialLoader.js]
	end
	A -- fetch, fs, csv-parse --> C[AmbientCG APIs & Files]
	B -- fetch, fs --> D[GPUOpen APIs & Files]
	C -- produces --> E[ambientcg_database.json, ambientcg_materials.json, zip files]
	D -- produces --> F[gpuopen_materials.json, zip files]
	A -- exports --> G[AmbientCGLoader instance]
	B -- exports --> H[JsGPUOpenMaterialLoader instance]

</div></code></pre>

