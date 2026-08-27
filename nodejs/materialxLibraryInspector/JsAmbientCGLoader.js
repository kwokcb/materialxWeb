
// Use global fetch if available (Node.js v18+), otherwise use node-fetch
const fetch =
    typeof globalThis.fetch === 'function'
        ? globalThis.fetch
        : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const { parse } = require('csv-parse/sync');

class AmbientCGLoader {
    /**
     * @brief Class to load materials from the AmbientCG site.
     * The class can convert the materials to MaterialX format for given target shading models.
     * @param {Object} mxModule - The MaterialX module. Required.
     * @param {Object} mxStdlib - The MaterialX standard library. Optional.
     */
    constructor(apiVersion = 'v3') {
        if (AmbientCGLoader.instance) {
            return AmbientCGLoader.instance;
        }

        this.logger = console;
        this.database = {};
        this.materials = null;
        this.materialNames = [];
        this.csvMaterials = null;
        this.downloadMaterial = null;
        this.downloadMaterialFileName = '';
        // AmbientCG API version to use ('v2' or 'v3'). V2 is deprecated upstream.
        this.apiVersion = apiVersion;

        // Cache the instance
        AmbientCGLoader.instance = this;
    }

    loadMaterialsFromCache() {
        const MATERIALS_CACHE_FILE = 'ambientcg_materials.json';
        if (fs.existsSync(MATERIALS_CACHE_FILE)) {
            try {
                const data = fs.readFileSync(MATERIALS_CACHE_FILE, 'utf8');
                this.materials = JSON.parse(data);
                this.logger.info(`Loaded AmbientCG materials from cache: ${MATERIALS_CACHE_FILE}`);
            } catch (e) {
                this.logger.warn(`Failed to load AmbientCG materials cache: ${e.message}`);
            }
        }
    }

    setDebugging(debug = true) {
        /**
         * @brief Set the debugging level for the logger.
         * @param {boolean} debug - True to set the logger to debug level, otherwise False.
         */
        this.logger.level = debug ? 'debug' : 'info';
    }

    setApiVersion(apiVersion = 'v3') {
        /**
         * @brief Set the ambientCG API version to use.
         * @param {string} apiVersion - The API version to use. Must be 'v2' or 'v3'.
         */
        if (apiVersion !== 'v2' && apiVersion !== 'v3') {
            this.logger.warn(`Invalid API version: ${apiVersion}. Using v3.`);
            apiVersion = 'v3';
        }
        this.apiVersion = apiVersion;
        this.logger.info(`Using ambientCG API version: ${apiVersion}`);
    }

    getMaterialNames(key = null) {
        /**
         * @brief Get the list of material names.
         * @param {string|null} key - The key to use for the material name. When null the default
         * is used: 'assetId' for the version 2 API, 'id' for the version 3 API.
         * @return {Array} The list of material names.
         */
        if (key === null) {
            key = this.apiVersion === 'v3' ? 'id' : 'assetId';
        }
        this.materialNames = [];
        const uniqueNames = new Set();
        if (this.materials) {
            this.materials.forEach(item => uniqueNames.add(item[key]));
        }
        this.materialNames = Array.from(uniqueNames).sort();
        return this.materialNames;
    }

    writeMaterialList(materialList, filename) {
        /**
         * @brief Write the material list in JSON format to a file.
         * @param {Array} materialList - The list of materials to write.
         * @param {string} filename - The file path to write the list to.
         */
        this.logger.info(`Writing material list to file: ${filename}`);
        fs.writeFileSync(filename, JSON.stringify(materialList, null, 4));
    }

    buildDownloadAttribute(imageFormat = 'PNG', imageResolution = '1') {
        /**
         * @brief Build the download attribute string for a given image format and resolution.
         * @param {string} imageFormat - The image format to download.
         * @param {string} imageResolution - The image resolution to download.
         * @return {string} The download attribute string.
         */
        return `${imageResolution}K-${imageFormat}`;
    }

    splitDownloadAttribute(downloadAttribute) {
        /**
         * @brief Split the download attribute into image format and resolution.
         * @param {string} downloadAttribute - The download attribute string.
         * @return {Array} A tuple of (imageFormat, imageResolution).
         * @note The download attribute is in the format: '1K-PNG'.
         */
        const parts = downloadAttribute.split('-');
    }

    getDownloadedMaterialInformation() {
        /**
         * @brief Get the current downloaded material information.
         * @return {Object} The downloaded material information.
         */
        return {
            filename: this.downloadMaterialFileName,
            content: this.downloadMaterial
        };
    }

    clearDownloadMaterial() {
        /**
         * @brief Clear any cached current material asset.
         */
        if (this.downloadMaterial) {
            this.downloadMaterial = null;
        }
        this.downloadMaterialFileName = '';
    }

    writeDownloadedMaterialToFile(path = '') {
        /**
         * @brief Write the currently downloaded file to file.
         * @param {string} path - The output path for the material. Default is empty.
         */
        const haveDownload = this.downloadMaterialFileName && this.downloadMaterial;
        if (!haveDownload) {
            this.logger.warning('No current material downloaded');
            return;
        }

        const filename = `${path}/${this.downloadMaterialFileName}`;
        fs.writeFileSync(filename, this.downloadMaterial);
        this.logger.info(`Saved downloaded material to: ${filename}`);
    }

    async downloadMaterialAsset(assetId, imageFormat = 'PNG', imageResolution = '1', downloadAttributeKey = 'downloadAttribute', downloadLinkKey = 'downloadLink') {
        /**
         * @brief Download a material with a given id and format + resolution for images.
         * @param {string} assetId - The string id of the material.
         * @param {string} imageFormat - The image format to download. Default is PNG.
         * @param {string} imageResolution - The image resolution to download. Default is 1.
         * @param {string} downloadAttributeKey - The download attribute key. Default is 'downloadAttribute'.
         * @param {string} downloadLinkKey - The download link key. Default is 'downloadLink'.
         * @return {string} File name of downloaded content.
         */
        this.clearDownloadMaterial();

        const items = this.findMaterial(assetId);
        const target = this.buildDownloadAttribute(imageFormat, imageResolution);
        let url = '';
        let downloadAttribute = '';

        if (this.apiVersion === 'v3') {
            // In v3 the download variants are nested under the asset's "downloads" array
            items.forEach(item => {
                (item.downloads || []).forEach(download => {
                    downloadAttribute = download.attributes;
                    if (downloadAttribute === target) {
                        url = download.url;
                        this.logger.info(`Found Asset: ${assetId}. Download Attribute: ${downloadAttribute} -> ${url}`);
                    }
                });
            });
        } else {
            items.forEach(item => {
                downloadAttribute = item[downloadAttributeKey];
                if (downloadAttribute === target) {
                    url = item[downloadLinkKey];
                    this.logger.info(`Found Asset: ${assetId}. Download Attribute: ${downloadAttribute} -> ${url}`);
                }
            });
        }

        if (!url) {
            this.logger.error(`No download link found for asset: ${assetId}, attribute: ${target}`);
            return '';
        }

        this.downloadMaterialFileName = url.split('file=')[1];

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        
            // Get the response as an ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();
        
            // Convert ArrayBuffer to Buffer
            this.downloadMaterial = Buffer.from(arrayBuffer);
            this.logger.info(`Material file downloaded: ${this.downloadMaterialFileName}`);

        } catch (error) {
            this.downloadMaterialFileName = '';
            this.logger.error(`Error occurred while downloading the file: ${error}`);
        }

        return this.downloadMaterialFileName;
    }

    findMaterial(assetId, key = null) {
        /**
         * @brief Get the list of materials matching a material identifier.
         * @param {string} assetId - Material string identifier.
         * @param {string|null} key - The key to lookup asset identifiers. When null the default
         * is used: 'assetId' for the version 2 API, 'id' for the version 3 API.
         * @return {Array} List of materials, or empty array if not found.
         */
        if (key === null) {
            key = this.apiVersion === 'v3' ? 'id' : 'assetId';
        }
        if (this.materials) {
            return this.materials.filter(item => item[key] === assetId);
        }
        return [];
    }

    loadMaterialsList(fileName) {
        /**
         * @brief Load in the list of downloadable materials from file.
         * @param {string} fileName - Name of JSON containing list.
         * @return {Array} Materials list.
         */
        this.materials = JSON.parse(fs.readFileSync(fileName, 'utf8'));
        this.logger.info(`Loaded materials list from: ${fileName}`);
        return this.materials;
    }

    async downloadMaterialsList() {
        /**
         * @brief Download the list of materials from the ambientCG site.
         * @return {Array} Materials list.
         */
        let haveMaterials = false;
        const MATERIALS_CACHE_FILE = 'ambientcg_materials.json';
        // 1. Try to load from cache file
        if (fs.existsSync(MATERIALS_CACHE_FILE)) {
            try {
                const data = fs.readFileSync(MATERIALS_CACHE_FILE, 'utf8');
                this.materials = JSON.parse(data);
                this.logger.info(`Loaded AmbientCG materials from cache: ${MATERIALS_CACHE_FILE}`);
                haveMaterials = true;   
            } catch (e) {
                this.logger.warn(`Failed to load AmbientCG materials cache: ${e.message}`);
            }
        }

        // 2. If not in cache, fetch from network
        if (!haveMaterials)
        {
            if (this.apiVersion === 'v3') {
                // In v3 the list comes from the JSON "assets" endpoint (paginated)
                this.materials = await this._fetchAssetsV3();
                this.logger.info(`Downloaded materials list (v3 API): ${this.materials.length} assets`);
            } else {
                const headers = { Accept: 'application/csv' };
                const url = new URL('https://ambientCG.com/api/v2/downloads_csv');
                url.searchParams.append('method', 'PBRPhotogrammetry');
                url.searchParams.append('type', 'Material');
                url.searchParams.append('sort', 'Alphabet');

                this.logger.info('Downloading materials CSV list from network...');
                try {
                    const response = await fetch(url, { headers });
                    if (response.status === 200) {
                        const csvContent = await response.text();
                        this.csvMaterials = csvContent;
                        this.materials = parse(csvContent, { columns: true });
                        this.logger.info('Downloaded CSV material list as JSON.');
                    } else {
                        this.materials = null;
                        this.logger.warning(`Failed to fetch the CSV material content. HTTP status code: ${response.status}`);
                    }
                } catch (error) {
                    this.materials = null;
                    this.logger.error(`Error downloading materials list: ${error}`);
                }

                // Read database list from file.
                this.readDatabaseFromFile('ambientcg_database.json');
                const have_database = this.database && Object.keys(this.database).length > 0;
                if (have_database) {
                    for (let material of this.materials) {
                        const assetId = material.assetId;
                        const databaseEntry = this.database.find(entry => entry.assetId === assetId);
                        if (databaseEntry) {
                            // Get "256-PNG" from previewImage (object, not Map)
                            let preview = '';
                            if (databaseEntry.previewImage && typeof databaseEntry.previewImage === 'object') {
                                preview = databaseEntry.previewImage['256-PNG'] || '';
                            }
                            material.displayCategory = databaseEntry.displayCategory;
                            material.previewImage = preview;
                            material.tags = databaseEntry.tags;
                        }
                        else {
                            this.logger.warn('No database entry found for assetId:', assetId);
                        }
                
                    }
                }
            }

            // Save to cache file after fetching
            try {
                fs.writeFileSync(MATERIALS_CACHE_FILE, JSON.stringify(this.materials, null, 2));
                this.logger.info(`Saved AmbientCG materials to cache: ${MATERIALS_CACHE_FILE}`);
            } catch (e) {
                this.logger.warn(`Failed to write AmbientCG materials cache: ${e.message}`);
            }
        }

        //console.log('>>> WRITE MATERIALS TO FILE:', this.materials.length);
        //this.writeMaterialList(this.materials, 'ambientcg_materials.json');

        return this.materials;
    }

    async _fetchAssetsV3(limit = 500, maxAssets = null) {
        /**
         * @brief Fetch the full list of assets using the version 3 "assets" endpoint,
         * following pagination until all assets are retrieved (each page is capped at
         * `limit` results, up to a maximum of 500).
         * @param {number} limit - The number of assets to request per page. Maximum is 500.
         * @param {number|null} maxAssets - Optional cap on the total number of assets to return.
         * @return {Array} The accumulated list of asset records.
         */
        const headers = { Accept: 'application/json' };
        const assets = [];
        const pageLimit = Math.min(limit, 500);
        let offset = 0;
        let totalResults = null;

        while (true) {
            const url = new URL('https://ambientCG.com/api/v3/assets');
            url.searchParams.append('type', 'material');
            url.searchParams.append('sort', 'alphabet');
            url.searchParams.append('include', 'downloads,title,type,thumbnails,tags');
            url.searchParams.append('limit', pageLimit);
            url.searchParams.append('offset', offset);

            this.logger.info(`Downloading materials list (v3 API)... offset=${offset}, limit=${pageLimit}`);
            const response = await fetch(url, { headers });
            if (response.status !== 200) {
                this.logger.warn(`Failed to fetch the materials list. HTTP status code: ${response.status}`);
                return assets;
            }
            const data = await response.json();
            const pageAssets = data.assets || [];
            assets.push(...pageAssets);
            totalResults = data.totalResults;
            offset += pageAssets.length;

            if (maxAssets !== null && assets.length >= maxAssets) {
                assets.splice(maxAssets);
                break;
            }
            if (pageAssets.length === 0) break;
            if (totalResults !== null && offset >= totalResults) break;
        }

        return assets;
    }

    getDataBase() {
        /**
         * @brief Get asset database.
         * @return {Object} Asset database.
         */
        return this.database;
    }

    async downloadAssetDatabase() {
        /**
         * @brief Download the asset database for materials from the ambientCG site.
         * @return {Object} The downloaded database.
         */
        this.database = {};

        let haveDatabase = false;
        const MATERIALS_DATABASE_FILE = 'ambientcg_database.json';
        if (fs.existsSync(MATERIALS_DATABASE_FILE)) {
            try {
                const data = fs.readFileSync(MATERIALS_DATABASE_FILE, 'utf8');
                this.database = JSON.parse(data);
                this.logger.info(`Loaded AmbientCG database from file: ${MATERIALS_DATABASE_FILE}`);
                haveDatabase = true;
            } catch (e) {
                this.logger.warn(`Failed to load AmbientCG database from file: ${e.message}`);
            }
        }

        if (!haveDatabase) {
            if (this.apiVersion === 'v3') {
                const assets = await this._fetchAssetsV3();
                this.database = { totalResults: assets.length, assets };
                return this.database;
            }

            const limit = 500
            //https://ambientcg.com/api/v2/full_json?type=material
            const headers = { Accept: 'application/json' };
            let url = new URL('https://ambientcg.com/api/v2/full_json');
            url.searchParams.append('method', 'PBRPhotogrammetry');
            url.searchParams.append('type', 'Material');
            url.searchParams.append('sort', 'Alphabet');        
            url.searchParams.append('limit', limit);
            url.searchParams.append('offset', 0);
            url.searchParams.append('include', 'tagData,previewData')

            let numberOfResults = -1;
            let offset = 0

            //let data_list = []
            let asset_list = []
            while (numberOfResults === -1 || offset < numberOfResults) {
                this.logger.info(`Downloading asset database from: ${url.toString()}`);

                try {
                    const response = await fetch(url, { headers });
                    if (response.status === 200) {
                        const data = await response.json();
                        this.logger.info(`Downloaded data at offset ${offset}. ${data.foundAssets.length} assets found.`);
                        //data_list.push(data);

                        // Only keep desired fiels: displayCategory, previewImage, tags and assetId from each entry
                        let reduced_assets = data.foundAssets.map(asset => {
                            return {
                                assetId: asset.assetId,
                                displayCategory: asset.displayCategory,
                                previewImage: asset.previewImage,
                                tags: asset.tags
                            }
                        });
                        asset_list = asset_list.concat(reduced_assets);

                        if (numberOfResults === -1) {
                            numberOfResults = data.numberOfResults;
                        }
                        // Update offset for next page
                        if (!data.nextPageHttp) 
                        {
                            break;
                        }
                        offset = offset + limit;
                        
                        url.searchParams.set('offset', offset);
                    } else {
                        this.logger.error(`Status: ${response.status}, ${response.data}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Error downloading asset database: ${error}`);
                }
            }

            this.database = asset_list;

            // Pull out the preview image link from database and put it
            // into the materials. 
        }

        return this.database;
    }

    writeDatabaseToFile(filename) {
        /**
         * @brief Write the database file.
         * @param {string} filename - The filename to write the JSON file to.
         * @return {boolean} True if the file was written successfully, otherwise False.
         */
        if (!this.database) {
            this.logger.info('No database to write');
            return false;
        }

        this.logger.info(`Writing database to file: ${filename}`);
        fs.writeFileSync(filename, JSON.stringify(this.database, null, 4));
        return true;
    }

    readDatabaseFromFile(filename) {
        /**
         * @brief Read the database file.
         * @param {string} filename - The filename to read the JSON file from.
         * @return {Object} The database object, or null if there was an error.
         */
        try {
            const data = fs.readFileSync(filename, 'utf8');
            this.database = JSON.parse(data);
            return this.database;
        } catch (e) {
            this.logger.error(`Failed to read database from file: ${e.message}`);
            return null;
        }
    }

    validateMaterialXDocument(doc) {
        /**
         * @brief Validate the MaterialX document.
         * @param {Object} doc - The MaterialX document to validate.
         * @return {Array} A tuple of (valid, errors) where valid is True if the document is valid, and errors is a list of errors if the document is invalid.
         */
        if (!this.mx) {
            this.logger.error('MaterialX module is required');
            return [false, ''];
        }

        if (!doc) {
            this.logger.warning('MaterialX document is required');
            return [false, ''];
        }

        const valid = doc.validate();
        return [valid, valid ? '' : 'Validation failed'];
    }

    addComment(doc, commentString) {
        /**
         * @brief Add a comment to the MaterialX document.
         * @param {Object} doc - The MaterialX document to add the comment to.
         * @param {string} commentString - The comment string to add.
         */
        const comment = doc.addChildOfCategory('comment');
        comment.setDocString(commentString);
    }

    getMaterialXString(doc) {
        /**
         * @brief Convert the MaterialX document to a string.
         * @param {Object} doc - The MaterialX document to convert.
         * @return {string} The MaterialX document as a string.
         */
        if (!this.mx) {
            this.logger.error('MaterialX module is required');
            return;
        }

        const writeOptions = this.mx.XmlWriteOptions();
        writeOptions.writeXIncludeEnable = false;
        writeOptions.elementPredicate = this.skipLibraryElement;
        return this.mx.writeToXmlString(doc, writeOptions);
    }
}

module.exports = new AmbientCGLoader();