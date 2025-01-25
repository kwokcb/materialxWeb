// File: main.js
// Description: Client-side JavaScript for the MaterialX Material Server
//
let extractedEditor = null;
 
// @brief Update the status input with a message
// @param message: The message to display
// @param force: Replace vs append to the existing message
//
function updateStatusInput(message, force = false) {
    const inputDOM = document.getElementById('status_message');
    if (inputDOM.value == 'Status' || force)
        inputDOM.value = message
    else
        inputDOM.value += '\n' + message
    // Scroll to the bottom of the textarea
    inputDOM.scrollTop = inputDOM.scrollHeight;
}

// @brief Fetch materials from the appropriate server
// @param source: Material server identifier
//
async function fetchMaterials(source) {
    try {
        updateStatusInput('- Client: Fetching materials...');
        if (source === 'GPUOpen') {
            fetchGPUOpenMaterials();
        }
        else if (source == 'AmbientCG') {
            fetchAmbientCGMaterials();
        }
        else
        {
            console.log('- Client: Unknown source:', source);
        }

    } catch (error) {
        console.error('Error fetching materials:', error);
    }
}

//////////////////////////////////////////////////////////
// ambientCG Handlers
//////////////////////////////////////////////////////////

// @brief Fetch materials from AmbientCG and displays the material list
async function fetchAmbientCGMaterials() 
{
    let query = '/api/materials?source=AmbientCG'

    const cacheKey = query;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        updateStatusInput('- Client: Cached materials');
        const materials = JSON.parse(cachedData);
        displayAmbientCGMaterials(materials);
        return;
    }

    const response = await fetch(query);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const materials = await response.json();
    updateStatusInput('- Client: Fetched materials');
    localStorage.setItem(cacheKey, JSON.stringify(materials)); // Cache the response
    displayAmbientCGMaterials(materials);
}

// @brief Display the AmbientCG materials in a table
function displayAmbientCGMaterials(materials) {

    if (!Array.isArray(materials)) {
        console.error('Invalid materials list:', materials);
        return;
    }
    // Create table-like display for materials
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = ''; // Clear existing content

    // Create a table element
    const tbl = document.createElement('table');
    tbl.classList.add('table');
    tbl.style.fontSize = '10px';

    // Update status (assuming updateStatusInput is a defined function)
    updateStatusInput('- Server: Display material list...');

    // Iterate through the materials list
    let tblFragment = document.createDocumentFragment();
    materials.forEach((material, materialNumber) => {
        // Create a table row for each material
        const materialRow = document.createElement('tr');
        materialRow.classList.add('row-sm');

        const assetId =material.assetId
        const downloadAttribute = material.downloadAttribute;
        const parts = downloadAttribute.split('-');
        const imageFormat = parts[1];
        let imageResolution = parts[0];
        // Only want the 1 from 1K in imageResolution
        if (imageResolution.endsWith('K')) {
            imageResolution = imageResolution.slice(0, -1);
        }

        // Populate the row with material data
        materialRow.innerHTML = `
            <td class="col-sm">${assetId} ${material.downloadAttribute}</td>
            <td class="col-sm">
                <button style="font-size: 10px" class="btn btn-primary" onclick="downloadAmbientCGPackage('${assetId}','${imageFormat}','${imageResolution}')">Download Package</button>
            </td>
        `;

        // Append the row to the table
        tblFragment.appendChild(materialRow);
    });

    tbl.appendChild(tblFragment);

    // Append the table to the content div
    contentDiv.appendChild(tbl);

    convertTableToBootstrapRowCol(contentDiv);
}

// @brief Download an AmbientCG material package
// @param assetId: The asset ID of the material
// @param imageFormat: The image format to download. Default is 'PNG'
// @param imageResolution: The image resolution to download. Default is 1
// @return None
async function downloadAmbientCGPackage(assetId, imageFormat = 'PNG', imageResolution = '1') {
    try {
        let query = '/api/downloadAmbientCGPackage?' +                 
            'assetId=' + assetId + 
            '&imageFormat=' + imageFormat + 
            '&imageResolution=' + imageResolution;

        updateStatusInput('- CLIENT: Download query: ' + query);

        const response = await fetch(query);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await displayMaterialPackage(response);

    } catch (error) {
        console.error('Error downloading package:', error);
    }
}

//////////////////////////////////////////////////////////
// GPUOpen Handlers
//////////////////////////////////////////////////////////

// @breif Fetch materials from GPUOpen and display the material list
//
async function fetchGPUOpenMaterials() 
{
    let query = '/api/materials?source=GPUOpen'

    const cacheKey = query;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        updateStatusInput('- Client: Cached materials');
        const materials = JSON.parse(cachedData);
        displayGPUOpenMaterials(materials);
        return;
    }

    const response = await fetch(query);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const materials = await response.json();
    localStorage.setItem(cacheKey, JSON.stringify(materials)); // Cache the response
    updateStatusInput('- Client: Fetched materials');
    displayGPUOpenMaterials(materials);
}

// @brief Display the GPUOpen materials in a table
// @param materials: The materials list to display
//
function displayGPUOpenMaterials(materials) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '';

    let tbl = document.createElement('table')
    tbl.classList.add('table');
    tbl.style.fontSize = '10px';

    updateStatusInput('- Server: Display material list...');
    let tblFragment = document.createDocumentFragment();
    materials.forEach((materialList, listNumber) => {
        materialList.results.forEach((material, materialNumber) => {
            const materialDiv = document.createElement('tr');
            materialDiv.classList.add('row-sm');
            materialDiv.innerHTML = `
                <td class="col-sm">${material.title}</td>
                <td class="col-sm">
                <button style="font-size: 10px" class="btn btn-primary" onclick="downloadGPUOpenPackage(${listNumber}, ${materialNumber})">Download Package</button>
                </td>
            `;
            tblFragment.appendChild(materialDiv);
        });
    });
    tbl.appendChild(tblFragment);

    contentDiv.appendChild(tbl);

    convertTableToBootstrapRowCol(contentDiv);
}

// @brief Display unzipped data found in the response for a query
// @param response: The response object from the fetch query
// @return None
async function displayMaterialPackage(response) {
    // Extract the title from the custom header
    const title = response.headers.get('X-File-Title');
    downloaded_material_name = document.getElementById('downloaded_material_name');
    downloaded_material_name.innerText = title;

    downloaded_materialx_filename = document.getElementById('downloaded_materialx_filename');

    downloaded_materialx_filename = document.getElementById('downloaded_materialx_filename');

    // Convert the response to an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Create a Blob from the ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: 'application/zip' });

    // Create a URL for the Blob
    const url = window.URL.createObjectURL(blob);

    updateStatusInput('- Client: Save download: ' + title);

    // Create a temporary <a> element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    document.body.appendChild(a); // Append the <a> element to the DOM
    a.click(); // Trigger the download

    // Clean up
    window.URL.revokeObjectURL(url); // Release the Blob URL
    document.body.removeChild(a); // Remove the <a> element from the DOM    

    ///////////////////////////////////////////////////////
    updateStatusInput('- Client: Display Unpacked Data....: ' + title);

    const imageDOM = document.getElementById('extracted_images');
    imageDOM.innerHTML = ''; // Clear existing images
    const mtlxDOM = document.getElementById('extracted_mtlx');
    mtlxDOM.value = '';
    extractedEditor.setValue('');

    // Use fflate to unzip the arrayBuffer
    const zipData = new Uint8Array(arrayBuffer);
    const unzipped = fflate.unzipSync(zipData);

    // Traverse the unzipped files and pull out ".mtlx" files as text
    // and ".png" files as data URLs
    for (const [filename, fileData] of Object.entries(unzipped)) {
        if (filename.endsWith('/')) {
            // Skip directories
            continue;
        }

        const extension = filename.split('.').pop();
        if (extension === 'mtlx') {
            updateStatusInput('- Client: Extract MTLX file: ' + filename);
            downloaded_materialx_filename.innerText = filename;
            const text = new TextDecoder().decode(fileData);
            mtlxDOM.value = text;
            downloaded_materialx_filename.innerText = filename;
            extractedEditor.setValue(text);
        } else if (extension === 'png' || extension === 'jpg') {
            // Extract out the image to show in an img element
            updateStatusInput('- Client: Extract image file: ' + filename + ", size: " + fileData.length);

            // Create a Blob from the file data
            const blob = new Blob([fileData], { type: `image/${extension}` });

            // Create a Blob URL
            const url = URL.createObjectURL(blob);

            // Create a container for the image and label
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('col-sm');
            imageContainer.style.display = 'inline-block';
            imageContainer.style.margin = '10px';
            imageContainer.style.textAlign = 'center'; // Center the label under the image

            // Create the image element
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.src = url;
            img.width = 128;
            img.alt = filename;

            // Add the filename as a tooltip
            img.title = filename;

            // Create a label for the image
            const label = document.createElement('div');
            label.innerText = filename;
            // Replace "/" with " / " for better display
            //label.innerText = label.innerText.replace(/\//g, ' / ');
            label.style.fontSize = '0.8rem';

            // Append the image and label to the container
            imageContainer.appendChild(img);
            imageContainer.appendChild(label);

            // Append the container to the image DOM
            imageDOM.appendChild(imageContainer);
        } else {
            updateStatusInput('- Client: Ignore unpacking file: ' + filename);
        }
    }

    updateStatusInput('- Client: Display Unpacked Data....done: ' + title);
}

async function downloadGPUOpenPackage(listNumber, materialNumber) {
    try {
        let query = '/api/downloadGPUOpenPackage?listNumber=' +
            listNumber + '&materialNumber=' +
            materialNumber + '&packageId=0';

        updateStatusInput('- CLIENT: Download query: ' + query);

        const response = await fetch(query);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await displayMaterialPackage(response);

    } catch (error) {
        console.error('Error downloading package:', error);
    }
}

//////////////////////////////////////////////////////////
// Styling
//////////////////////////////////////////////////////////
function convertTableToBootstrapRowCol(container) {
    // Modify the table to make it scrollable using Bootstrap classes
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
        // Add Bootstrap table classes
        table.classList.add('table', 'table-striped');

        // Wrap the table in a div with Bootstrap's 'overflow-auto' class
        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('overflow-auto');
        wrapperDiv.style.maxWidth = '100%';
        wrapperDiv.style.maxHeight = '200px';

        // Move the table inside the wrapper div
        table.parentNode.insertBefore(wrapperDiv, table);
        wrapperDiv.appendChild(table);

        // Add a Bootstrap color class to the table header
        const thead = table.querySelector('thead');
        const headerColorClass = 'table-primary';
        if (thead) {
            thead.classList.add(headerColorClass);
        } else {
            //const firstRow = table.querySelector('tr');
            //if (firstRow) {
            //    firstRow.classList.add(headerColorClass);
            //}
        }
    });
}

// Function to create and download a ZIP file
async function createAndDownloadZip() {
    try {
        // Get the .mtlx content
        let mtlxContent = extractedEditor.getValue();
        if (!mtlxContent) {
            console.log('No .mtlx content to download.');
        }

        // Get the image files from the DOM
        const imageElements = document.querySelectorAll('#extracted_images img');
        if (imageElements.length === 0) {
            console.log('No images to download.');
        }

        if (!mtlxContent && imageElements.length === 0) {
            alert('No .mtlx content or images to download.');
            return;
        }

        let zipName = document.getElementById('downloaded_material_name').innerText;
        if (!downloaded_material_name) {
            zipName = 'material.zip';
        }
        
        let mtlxFilename = document.getElementById('downloaded_materialx_filename').innerText;
        if (!mtlxFilename) {
            mtlxFilename = 'material.mtlx';
        }

        // Create a new ZIP object
        const zip = {};

        // Add the .mtlx file to the ZIP
        // Hack: Replace any string "fileprefix="something" with "fileprefix="
        mtlxContent = mtlxContent.replace(/fileprefix="[^"]*"/g, 'fileprefix=""');
        zip[mtlxFilename] = fflate.strToU8(mtlxContent);

        // Add each image to the ZIP
        for (const img of imageElements) {
            const filename = img.alt; // Use the alt text as the filename
            const blob = await fetch(img.src).then((res) => res.blob());
            const arrayBuffer = await blob.arrayBuffer();
            zip[filename] = new Uint8Array(arrayBuffer);
        }

        // Compress the ZIP file
        const zipped = fflate.zipSync(zip);

        // Create a Blob from the zipped data
        const blob = new Blob([zipped], { type: 'application/zip' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        updateStatusInput('- Client: Created ZIP file. Ready for download.');
    } catch (error) {
        console.error('Error creating ZIP file:', error);
        updateStatusInput('- Client: Failed to create ZIP file.');
    }
}

function setupXML() {
    // Initialize CodeMirror for extracted MaterialX content
    const materialXTextArea2 = document.getElementById('extracted_mtlx');
    extractedEditor = CodeMirror.fromTextArea(materialXTextArea2, {
        mode: 'application/xml',
        lineNumbers: true,
        theme: 'dracula',
    });
    extractedEditor.setSize('auto', '200px');
}

function setupLibrarySelector() {

    document.getElementById('gpuopen_source').addEventListener('click', function () {
        selectSource('GPUOpen');
    });
    document.getElementById('ambientcg_source').addEventListener('click', function () {
        selectSource('AmbientCG');
    });

    function selectSource(source) {
        document.getElementById('dropdownMenuButton').innerText = source;
        document.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`#${source.toLowerCase().replace(' ', '')}_source`).classList.add('active');
    }
    selectSource('GPUOpen');
}

function main() 
{
    setupXML();

    setupLibrarySelector()

    document.getElementById('clear_status').addEventListener('click', () => {
        updateStatusInput('Status', true);
    });

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    document.getElementById('fetch_materials').addEventListener('click', debounce(() => {
        source = document.getElementById('dropdownMenuButton');
        fetchMaterials(source.innerText);
    }, 300));

    /*
    document.getElementById('fetch_materials').addEventListener('click', () => {
        source = document.getElementById('dropdownMenuButton');
        console.log('Source:', source.innerText);
        fetchMaterials(source.innerText);
    }); */

    // Add event listener for the download button
    document.getElementById('download_zip').addEventListener('click', createAndDownloadZip);

    // Clear load storage on page reload
    window.addEventListener('beforeunload', () => {
        localStorage.clear();
        console.log('>>>> LocalStorage cleared on page reload.');
    });
}

main();