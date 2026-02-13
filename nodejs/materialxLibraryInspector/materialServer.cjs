// @file: materialServer.cjs
// @brief: Initialize express server to serve static files and proxy requests 
// to download materials
//
const express = require('express');
const cors = require('cors');
// Loaders return an instance of the loader class
const gpuopen_loader = require('./JsGPUOpenMaterialLoader'); 
const ambientcg_loader = require('./JsAmbientCGLoader');

// @btief: Initialize the express server
function initializeServer() {

    const app = express();

    // Enable CORS for all routes
    app.use(cors());

    // Serve static files from the 'public' directory
    app.use(express.static('public'));

    app.get('/api/previews', async (req, res) => {
        try {
            const { source } = req.query
            console.log('- Server: Fetch material previews from:', source)
            if (source == 'GPUOpen') {
                const previews = await gpuopen_loader.getPreviews();
                res.json(previews);
            }
        } catch (error) {
            console.error('- Server: Error fetching material previews:', error);
            res.status(500).json({ error: '- Server: Failed to fetch material previews' });
        }
    });

    // Proxy endpoint to fetch materials
    app.get('/api/materials', async (req, res) => {
        try {
            const { source } = req.query
            console.log('- Server: Download materials from:', source)
            if (source == 'GPUOpen') {
                const materials = await gpuopen_loader.getMaterials();
                res.json(materials);
            }
            else if (source == 'AmbientCG') {
                //console.log(ambientcg_loader)
                const materials = await ambientcg_loader.downloadMaterialsList();

                //console.log('- Server: Read database...');
                //const database = await ambientcg_loader.downloadAssetDatabase();
                //ambientcg_loader.writeDatabaseToFile('ambientcg_database.json');
                //ambientcg_loader.readDatabaseFromFile('ambientcg_database.json');

                res.json(materials);
            }
        } catch (error) {
            console.error('- Server: Error fetching materials:', error);
            res.status(500).json({ error: '- Server: Failed to fetch materials' });
        }
    });

    // Proxy endpoint to download a material package from AmbientCG
    app.get('/api/downloadAmbientCGPackage', async (req, res) => {
        try {
            const { assetId, imageFormat, imageResolution } = req.query;
            console.log('- Server: Download Package: ', assetId, imageFormat, imageResolution);
            const materialName = await ambientcg_loader.downloadMaterialAsset(assetId, imageFormat, imageResolution); 
            console.log('- Server: Downloaded:"', materialName);

            const result = ambientcg_loader.getDownloadedMaterialInformation();
            let filename = result.filename;

            // Sanitize the filename
            const sanitizeFilename = (filename) => {
                return filename.replace(/[^a-z0-9_.-]/gi, '_'); 
            };
            const safeFilename = sanitizeFilename(materialName);

            // Set headers for the zip file and include the title
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
            res.setHeader('X-File-Title', safeFilename); // Custom header for the title

            // Send the binary data directly
            console.log('- Server: Sending data:', safeFilename);
            res.send(Buffer.from(result.content));
        }
        catch (error) {
            console.error('Error downloading package:', error);
            res.status(500).json({ error: 'Failed to download package' });
        }
    });

    // Proxy endpoint to download a material package from GPUOpen
    app.get('/api/downloadGPUOpenPackage', async (req, res) => {
        try {
            const { listNumber, materialNumber, packageId } = req.query;
            //const loader = new JsGPUOpenMaterialLoader();
            console.log('- Server: Download Package: ', listNumber, materialNumber, packageId)
            const [data, title] = await gpuopen_loader.downloadPackage(
                parseInt(listNumber),
                parseInt(materialNumber),
                parseInt(packageId)
            );

            const sanitizeFilename = (filename) => {
                return filename.replace(/[^a-z0-9_.-]/gi, '_'); // Replace invalid characters with underscores
            };

            if (data) {
                console.log('- Server: Downloaded:"', title, '", Data:', data != null)

                // Sanitize the filename
                const sanitizeFilename = (filename) => {
                    return filename.replace(/[^a-z0-9_.-]/gi, '_'); // Replace invalid characters with underscores
                };
                const safeFilename = sanitizeFilename(title) + '.zip';

                // Set headers for the zip file and include the title
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
                res.setHeader('X-File-Title', safeFilename); // Custom header for the title

                // Send the binary data directly
                res.send(Buffer.from(data));
            }

            else {
                res.status(404).json({ error: 'Package not found' });
            }
        } catch (error) {
            console.error('Error downloading package:', error);
            res.status(500).json({ error: 'Failed to download package' });
        }
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

initializeServer();