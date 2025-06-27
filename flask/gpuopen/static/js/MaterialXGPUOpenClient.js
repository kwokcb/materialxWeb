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
                        //console.log('>>>>>>>>>> Found Material:', result.title);
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

    handleMaterialXDownLoad(data)
    {
        console.log('WEB: materialx downloaded event:', data);
        this.materialCount = data.materialCount;
        this.materialsList = data.materialsList;
        this.materialNames = data.materialNames;

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
        }        
    }

    handleMaterialXExtract(data) 
    {
        console.log('WEB: materialx extracted event:', data.extractedData);
        const extractedData = data.extractedData[0];
        const title = extractedData.title;
        console.log('Title:', title);

        const dataObj = extractedData.data;
        const imageDOM = document.getElementById('extracted_images');
        imageDOM.innerHTML = ''; // Clear existing images

        const mtlxDOM = document.getElementById('extracted_mtlx');
        this.extractedEditor.setValue('');

        // Extract MTLX and images out. 
        // Optionally save zip of data to file.
        let save_extracted = document.getElementById('save_extracted').checked;
        let zip = save_extracted ? new JSZip() : null;
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
                imageContainer.style.display = 'inline-block';
                imageContainer.style.margin = '10px';
                imageContainer.style.textAlign = 'center'; // Center the label under the image
                
                // Create the image element
                const img = document.createElement('img');
                img.src = url;
                img.width = 200;
                img.alt = key;
                
                // Add the key as a tooltip
                img.title = key; 
                
                // Create a label for the image
                const label = document.createElement('div');
                label.innerText = key;
                label.style.fontSize = '0.8rem'; 
                //label.style.color = '#FFF'; // 
                
                // Append the image and label to the container
                imageContainer.appendChild(img);
                imageContainer.appendChild(label);
                
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
        const materialSelect = document.getElementById('materialSelect');
        const update_mtlx = document.getElementById('update_mtlx').checked;
        let selectedItem = materialSelect.options[materialSelect.selectedIndex].text;
        console.log("WEB: Emitting extract_material event");
        this.emit('extract_material', { expression: selectedItem, update_materialx: update_mtlx });
    }

    downloadMaterials() {
        console.log("WEB: Emitting download_materialx event");
        this.emit('download_materialx', {});
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

