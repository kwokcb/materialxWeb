import { WebSocketClient, WebSocketEventHandlers } from './WebSocketClient.js';

export class MaterialX_Conversion_Client extends WebSocketClient {
    constructor(socketLibrary, server) {
        // Call parent to setup socket I/O.
        super(socketLibrary, server);

        let editor = null;
        let usdEditor = null;
        let gltfEditor = null;

        this.setupEventHandlers = this.setupEventHandlers.bind(this);
        this.setupXML = this.setupXML.bind(this);
    }

    setupEventHandlers() {
        console.log('Set up event handlers...')

        let app = this;

        document.getElementById('getMTLXButton').addEventListener('click', function () {
            console.log("WEB: Emitting load_materialx event");

            // Add UI to select the materialx file from a dialog
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.mtlx';
            let fileName = '';
            input.onchange = function (event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const content = e.target.result;
                        console.log('socket: ', app)
                        app.socket.emit('load_materialx', { materialxFile: fileName, content: content });
                    }
                    reader.readAsText(file);
                };
            };
            input.click();
        });
        this.socket.on('materialx_loaded', function (data) {
            console.log('WEB: materialx loaded event:') //, data.materialxDocument);
            //console.log('Web: Emitting convert_mtlx_to_usd event');
            app.editor.setValue(data.materialxDocument);
        });

        document.getElementById('renderMTLXButton').addEventListener('click', function () {
            console.log('Web: Emitting render_mtlx event');
            app.socket.emit('render_materialx', { materialxDocument: document.getElementById('mtlxOutput').value });
        });
        this.socket.on('materialx_rendered', function (data) {
            console.log('WEB: mtlx rendered event:', data.image ? 'Have image' : 'No image');
            let base64String = data.image
            if (base64String) {
                const base64String = data.image;

                // Decode Base64 to binary and create a Blob
                const binary = atob(base64String); // Decode Base64 to binary
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i); // Convert to Uint8Array
                }
                const blob = new Blob([array], { type: 'image/png' }); // Create a Blob

                // Create a URL for the Blob and display the image
                const url = URL.createObjectURL(blob);
                document.getElementById('mtlxImage').src = url;
                document.getElementById('mtlxImage').style.display = 'block';
            }
            else {
                document.getElementById('mtlxImage').style.display = 'none';
            }
        });

        // Listen for the 'title_updated' event
        // When the event is received, update the title
        //this.socket.on('title_updated', function(data) {
        //    console.log('WEB: title updated event:', data.updatedTitle);
        //    document.getElementById('title').textContent = data.updatedTitle;
        //});

        // USD Handling
        document.getElementById('convertToUsd').addEventListener('click', function () {
            console.log('Web: Emitting convert_mtlx_to_usd event');
            app.socket.emit('convert_mtlx_to_usd', { materialxDocument: document.getElementById('mtlxOutput').value });
        });
        this.socket.on('usd_converted', function (data) {
            console.log('WEB: usd converted event:'); //, data.usdDocument);
            app.usdEditor.setValue(data.usdDocument);
        });

        // glTF Handling
        document.getElementById('convertToglTF').addEventListener('click', function () {
            console.log('Web: Emitting convert_mtlx_to_gltf event');
            app.socket.emit('convert_mtlx_to_gltf', { materialxDocument: document.getElementById('mtlxOutput').value });
        });
        this.socket.on('gltf_converted', function (data) {
            console.log('WEB: gltf converted event:'); //, data.usdDocument);
            app.glTFEditor.setValue(data.document);
        });

        // Handle Python status messages
        this.socket.on('python_status', function (data) {
            console.log('WEB: python_status event:', data.status);
        });
    }

    setupXML() {
        // Initialize CodeMirror for XML syntax highlighting
        const materialXTextArea = document.getElementById('mtlxOutput');
        this.editor = CodeMirror.fromTextArea(materialXTextArea, {
            mode: 'application/xml',
            lineNumbers: true,
            dragDrop: true,
            theme: 'night'
        });

        // Optional: Set an initial value for the textarea
        const initialXML = '<?xml version="1.0" encoding="utf-8"?>\r\n<materialx version="1.38" colorspace="lin_rec709">\r\n</materialx>';
        materialXTextArea.value = initialXML;
        this.editor.setValue(initialXML);

        // Update CodeMirror whenever the textarea content changes
        this.editor.on('change', () => {
            // Copy the content from CodeMirror back to the textarea
            materialXTextArea.value = this.editor.getValue();
        });
        this.editor.setSize('auto', '300px');
        //var pasteButton = document.getElementById('materialXTextArea_paste');
        //if (pasteButton) {
        //    addPasteHandler(pasteButton, editor);
        //}            

        ///////////////////////////////////////////////////////////////////////////////

        const usdOutput = document.getElementById('usdOutput');
        this.usdEditor = CodeMirror.fromTextArea(usdOutput, {
            mode: 'application/javascript',
            lineNumbers: true,
            dragDrop: true,
            theme: 'dracula'
        });

        // Optional: Set an initial value for the textarea
        const initialUsd = ''; //'<?xml version="1.0" encoding="utf-8"?>\r\n<materialx version="1.38" colorspace="lin_rec709">\r\n</materialx>';
        usdOutput.value = initialUsd;
        this.usdEditor.setValue(initialUsd);

        // Update CodeMirror whenever the textarea content changes
        this.usdEditor.on('change', () => {
            // Copy the content from CodeMirror back to the textarea
            usdOutput.value = this.usdEditor.getValue();
        });
        this.usdEditor.setSize('auto', '300px');
        //var pasteButton = document.getElementById('usdOutput_paste');
        //if (pasteButton) {
        //    addPasteHandler(pasteButton, usdEditor);
        //}            

        ///////////////////////////////////////////////////////////////////////////////
        const glTFOutput = document.getElementById('glTFOutput');
        this.glTFEditor = CodeMirror.fromTextArea(glTFOutput, {
            mode: 'application/json',
            lineNumbers: true,
            dragDrop: true,
            theme: 'night'
        });

        // Optional: Set an initial value for the textarea
        const initialglTF = ''; //'<?xml version="1.0" encoding="utf-8"?>\r\n<materialx version="1.38" colorspace="lin_rec709">\r\n</materialx>';
        glTFOutput.value = initialglTF;
        this.glTFEditor.setValue(initialglTF);

        // Update CodeMirror whenever the textarea content changes
        this.glTFEditor.on('change', () => {
            // Copy the content from CodeMirror back to the textarea
            glTFOutput.value = this.glTFEditor.getValue();
        });
        this.glTFEditor.setSize('auto', '300px');
        //var pasteButton = document.getElementById('usdOutput_paste');
        //if (pasteButton) {
        //    addPasteHandler(pasteButton, glTFEditor);
        //}            

    }
}
