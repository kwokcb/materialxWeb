import { WebSocketClient,  WebSocketEventHandlers } from './WebSocketClient.js';

export class MaterialX_GPUOpen_Client extends WebSocketClient
{
    constructor(socketLibrary, server) {
        // Call parent to setup socket I/O.
        super(socketLibrary, server);
 
        this.editor = null;
        this.extractedEditor = null;
        this.materialsList = [];
        this.materialNames = [];
        this.materialCount = 0;

        // Bind class methods to `this`
        this.findMaterialByName = this.findMaterialByName.bind(this);
        this.populateForm = this.populateForm.bind(this);
        this.setupEventHandlers = this.setupEventHandlers.bind(this);
        this.setupXML = this.setupXML.bind(this);

        // Setup XML editors
        this.setupXML();
    }


    findMaterialByName(name) {
        let foundMaterial = null;

        for (const element of this.materialsList) {
            let resultsArray = JSON.parse(element).results;
            if (resultsArray) {
                for (const result of resultsArray) {
                    if (result.title === name) {
                        foundMaterial = result;
                        console.log('>>>>>>>>>> Popultate form:', result.title);
                        this.populateForm(result);
                        return foundMaterial;
                    }
                }
            }
        }
        return null; // Return null if no match is found
    }

    updateStatusInput(message, force = false) 
    {
        const inputDOM = document.getElementById('status_message');
        if (inputDOM.value == 'Status' || force)        
            inputDOM.value = message
        else
            inputDOM.value += '\n' + message
        // Scroll to the bottom of the textarea
        inputDOM.scrollTop = inputDOM.scrollHeight;
    }

    selectMaterialByName(name) {
        const materialSelect = document.getElementById('materialSelect');
        for (let i = 0; i < materialSelect.options.length; i++) {
            if (materialSelect.options[i].text === name) {
                materialSelect.selectedIndex = i;
                return;
            }
        }
    }

    highlightSelectedMaterialInGallery(name) {
        const gallery = document.getElementById('material_gallery');
        const cards = gallery.getElementsByClassName('material-card');
        for (const card of cards) {
            if (card.dataset.materialId === name) {
                card.style.backgroundColor = '#007BFF'; // Highlight color
                card.style.color = '#FFF'; // Text color for better contrast
                card.classList.add('selected');
                // Scroll the selected card into view
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                card.style.backgroundColor = ''; // Reset background color
                card.style.color = ''; // Reset text color
                card.classList.remove('selected');
            }
        }
        this.findMaterialByName(name);
    }

    handleMaterialXDownLoad(data)
    {
        const downloadSpinner = document.getElementById('download_spinner');
        const downloadStatus = document.getElementById('download_status');
        downloadSpinner.classList.add('d-none'); // Hide spinner
        downloadStatus.innerText = 'Fetch Materials';

        console.log('WEB: materialx downloaded event:', data);
        this.materialCount = data.materialCount;
        this.materialsList = data.materialsList;
        this.materialNames = data.materialNames;
        // Sort materialNames alphabetically
        this.materialNames.sort((a, b) => a.localeCompare(b));

        if (this.materialCount > 0) {
            let listString = '';
            for (const element of this.materialsList) {
                listString += element + '\n';
            }
            this.editor.setValue(listString);

            // Populate the material select dropdown
            const materialSelect = document.getElementById('materialSelect');
            materialSelect.innerHTML = ''; // Clear existing options
            this.materialNames.forEach((name, index) => {
                const option = document.createElement('option');
                option.value = index + 1;
                option.text = name;
                materialSelect.appendChild(option);
            });

            // Populate the form with the first material
            const firstMaterial = JSON.parse(this.materialsList[0]).results[0];
            if (firstMaterial) {
                this.populateForm(firstMaterial);
            }

            // Render preview images in gallery using preview URL from backend
            const gallery = document.getElementById('material_gallery');
            gallery.innerHTML = '';
            let firstTitle = '';
            for (const element of this.materialsList) {
                let materials = JSON.parse(element).results;
                if (materials) {
                    // Sort by title
                    materials.sort((a, b) => a.title.localeCompare(b.title));
                    for (const material of materials) 
                    {
                        if (material.url) {
                            if (!firstTitle)
                                firstTitle = material.title;

                            const col = document.createElement('div');
                            col.className = 'col-sm-4 col-md-3 col-lg-2 mb-4';

                            col.innerHTML = `
                                <div class="card material-card" data-material-id="${material.title}">
                                    <img src="${material.url}" id="${material.title} Image" class="card-img-top material-img" alt="${material.title}">
                                    <div class="card-body">
                                        <div style="font-size: 10px;" class="card-title">${material.title}</div>
                                    </div>
                                </div>
                            `;

                            // Select material when clicking on the card
                            col.querySelector('.card').addEventListener('click', () => {
                                this.highlightSelectedMaterialInGallery(material.title);
                                this.selectMaterialByName(material.title);
                            });
                            gallery.appendChild(col);
                        }
                    }
                }
            }

            if (firstTitle) {
                this.highlightSelectedMaterialInGallery(firstTitle);
                this.selectMaterialByName(firstTitle);
            }
        }
    }

    handleMaterialXExtract(data) 
    {
        const extractSpinner = document.getElementById('extract_spinner');
        extractSpinner.classList.add('d-none'); // Hide spinner
        const extractStatus = document.getElementById('extract_status');
        extractStatus.innerText = 'Extract'; 

        console.log('WEB: materialx extracted event:', data.extractedData);
        const extractedData = data.extractedData[0];
        if (!extractedData) {
            console.log('No extracted data received');
            return;
        }
        const title = extractedData.title;
        console.log('Title:', title);

        const preview_url = extractedData.url;
        console.log('URL:', preview_url);

        const dataObj = extractedData.data;
        const imageDOM = document.getElementById('extracted_images');
        imageDOM.innerHTML = ''; // Clear existing images

        const mtlxDOM = document.getElementById('extracted_mtlx');
        this.extractedEditor.setValue('');

        // Extract MTLX and images out. 
        // Optionally save zip of data to file.
        let save_extracted = document.getElementById('save_extracted').checked;
        let zip = save_extracted ? new JSZip() : null;
        

        if (preview_url) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'col-sm-4 col-md-3 col-lg-2 mb-4';
            let key = "Preview Render";
            imageContainer.innerHTML = `
                <div class="card material-card" data-material-id="${key}">
                    <img loading="lazy" src="${preview_url}" id="${key} Image" class="card-img-top material-img" alt="${key}">
                    <div class="card-body">
                        <div style="font-size: 10px;" class="card-title">${key}</div>
                    </div>
                </div>
            `;

            // Add "url.txt" file to zip where "url" is the preview URL, for reference
            if (zip)
            {
                const urlFile = new File([preview_url], "url.txt", { type: 'text/plain' });
                zip.file("url.txt", urlFile);
            }
                    
            imageDOM.appendChild(imageContainer);
        }

        for (const key in dataObj) {
            if (key.endsWith('.mtlx')) {
                this.extractedEditor.setValue(dataObj[key]);
                // Add the extracted MaterialX file to the zip
                if (zip)
                    zip.file(key, dataObj[key]);
            } else {
                const base64String = dataObj[key];
                const binary = atob(base64String);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                const extension = key.split('.').pop();
                const blob = new Blob([array], { type: `image/${extension}` });
                const url = URL.createObjectURL(blob);

                // Create a container for the image and label
                const imageContainer = document.createElement('div');
                imageContainer.className = 'col-sm-4 col-md-3 col-lg-2 mb-4';
                imageContainer.innerHTML = `
                    <div class="card material-card" data-material-id="${key}">
                        <img src="${url}" id="${key} Image" class="card-img-top material-img" alt="${key}">
                        <div class="card-body">
                            <div style="font-size: 10px;" class="card-title">${key}</div>
                        </div>
                    </div>
                `;
                
                // Append the container to the image DOM
                imageDOM.appendChild(imageContainer);

                // Convert the blob to a file and add it to the zip
                if (zip)
                {
                    const imgFile = new File([blob], key, { type: 'image/${extension}' });
                    zip.file(key, imgFile);
                }
            }
        }


        // Create the zip file asynchronously
        if (zip)
        {
            zip.generateAsync({ type: 'blob' }).then(function(content) {
                // Create a download link for the zip file
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = title + '.zip'; // Set the name of the zip file
                link.click(); // Trigger the download
            })
            .catch(function(error) {
                console.error('Error creating zip file:', error);
            });           
        }        
    }

    extractMaterials() {
        const extractSpinner = document.getElementById('extract_spinner');
        const extractStatus = document.getElementById('extract_status');
        extractSpinner.classList.remove('d-none'); // Show spinner
        extractStatus.innerText = 'Extracting...';

        const materialSelect = document.getElementById('materialSelect');
        const update_mtlx = document.getElementById('update_mtlx').checked;
        let selectedItem = materialSelect.options[materialSelect.selectedIndex].text;
        console.log("WEB: Emitting extract_material event");
        this.emit('extract_material', { expression: selectedItem, update_materialx: update_mtlx });
    }

    downloadMaterials() {
        console.log("WEB: Emitting download_materialx event");
        let downloadSpinner = document.getElementById('download_spinner');
        let downloadStatus = document.getElementById('download_status');
        downloadSpinner.classList.remove('d-none'); // Show spinner
        downloadStatus.innerText = 'Fetching...';
        let from_package = document.getElementById('download_from_package').checked;
        this.emit('download_materialx', { 'frompackage': from_package });
    }

    setupEventHandlers() {
        // Setup clear status button
        document.getElementById('clear_status').addEventListener('click', () => {
            this.updateStatusInput('Status', true);
        });

        // Bind "Extract Material" button click
        document.getElementById('extract_material').addEventListener('click', () => {
            this.extractMaterials();
        });

        // Bind "Download MaterialX" button click
        document.getElementById('getMTLXButton').addEventListener('click', () => {
            this.downloadMaterials();
        });

        // Set up socket message event handlers
        this.webSocketWrapper = new WebSocketEventHandlers(this.socket, {
            materialx_status: (data) => { console.log('WEB: materialx status event:', data.message); this.updateStatusInput(data.message) },
            materialx_downloaded: (data) => { this.handleMaterialXDownLoad(data) },
            materialx_extracted: (data) => { this.handleMaterialXExtract(data) }
        });

        // Update material selection
        document.getElementById('materialSelect').addEventListener('change', () => {
            const materialSelect = document.getElementById('materialSelect');
            const selectedItem = materialSelect.options[materialSelect.selectedIndex].text;
            this.findMaterialByName(selectedItem);
            this.highlightSelectedMaterialInGallery(selectedItem);
        });
    }

    setupXML() {
        // Initialize CodeMirror for MaterialX content
        const materialXTextArea = document.getElementById('mtlxOutput');
        this.editor = CodeMirror.fromTextArea(materialXTextArea, {
            mode: 'application/json',
            lineNumbers: true,
            theme: 'dracula',
        });
        this.editor.setSize('auto', '300px');

        // Initialize CodeMirror for extracted MaterialX content
        const materialXTextArea2 = document.getElementById('extracted_mtlx');
        this.extractedEditor = CodeMirror.fromTextArea(materialXTextArea2, {
            mode: 'application/xml',
            lineNumbers: true,
            theme: 'dracula',
        });
        this.extractedEditor.setSize('auto', '300px');
    }

    populateForm(data) {
        document.getElementById('m_title').value = data.title || '';
        document.getElementById('author').value = data.author || '';
        const pdate = data.published_date || '';
        if (pdate) {
            const date = new Date(pdate);
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - offset * 60 * 1000);
            const formattedDate = localDate.toISOString().slice(0, 16);
            document.getElementById('published_date').value = formattedDate;
        }
        document.getElementById('mtlx_filename').value = data.mtlx_filename || '';
        document.getElementById('category').value = data.category || '';
        document.getElementById('status').value = data.status || 'Unpublished';
        document.getElementById('tags').value = data.tags ? data.tags.join(', ') : '';
        document.getElementById('packages').value = data.packages ? data.packages.join(', ') : '';
        document.getElementById('renders').value = data.renders ? data.renders.join(', ') : '';
        document.getElementById('description').value = data.description || '';
    }
}

