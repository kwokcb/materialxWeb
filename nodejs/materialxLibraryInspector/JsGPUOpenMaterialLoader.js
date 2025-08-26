/**
 * @class JsGPUOpenMaterialLoader
 * @brief Class to download MaterialX materials from the GPUOpen material database.
 * The class provides methods to fetch materials and download material packages.
 * The class uses the fetch API to make HTTP requests.
 * The class is intended to be used in a Node.js environment.
 */


// Use global fetch if available (Node.js v18+), otherwise use node-fetch
const fetch =
    typeof globalThis.fetch === 'function'
        ? globalThis.fetch
        : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const MATERIALS_CACHE_FILE = 'gpuopen_materials.json';

class JsGPUOpenMaterialLoader {
    /**
     * Constructor for the JsGPUOpenMaterialLoader class.
     */

    constructor() {
        if (JsGPUOpenMaterialLoader.instance) {
            return JsGPUOpenMaterialLoader.instance;
        }

        this.rootUrl = 'https://api.matlib.gpuopen.com/api';
        this.url = `${this.rootUrl}/materials`;
        this.packageUrl = `${this.rootUrl}/packages`;
        this.materials = null;
        this.materialNames = null;

        this.logger = console;

        // Cache the instance
        JsGPUOpenMaterialLoader.instance = this;
    }

    loadMaterialsFromCache() {
        if (fs.existsSync(MATERIALS_CACHE_FILE)) {
            try {
                const data = fs.readFileSync(MATERIALS_CACHE_FILE, 'utf8');
                this.materials = JSON.parse(data);
                // Rebuild materialNames
                this.materialNames = [];
                for (const jsonData of this.materials) {
                    for (const material of jsonData.results) {
                        this.materialNames.push(material['title']);
                    }
                }
                this.logger.info(`Loaded GPUOpen materials from cache: ${MATERIALS_CACHE_FILE}`);
            } catch (e) {
                this.logger.warn(`Failed to load GPUOpen materials cache: ${e.message}`);
            }
        }
    }

    /** 
     * Return downloaded material list
     * @return {Array} - List of materials
     */    
    getMaterialList() {
        // Save to cache file after fetching
        try {
            fs.writeFileSync(MATERIALS_CACHE_FILE, JSON.stringify(this.materials, null, 2));
            this.logger.info(`Saved GPUOpen materials to cache: ${MATERIALS_CACHE_FILE}`);
        } catch (e) {
            this.logger.warn(`Failed to write GPUOpen materials cache: ${e.message}`);
        }
        return this.materials;
    }

    /**
     * Return downloaded material names
     * @return {Array} - List of material names
     */
    getMaterialNames() {
        return this.materialNames;
    }

    /**
     * Get lists of materials from the GPUOpen material database.
     * @param {number} batchSize - Number of materials to fetch per batch
     * @return {Array} - List of material lists
     */
    async getMaterials(batchSize = 50) {
        // 1. Try to load from cache file
        if (fs.existsSync(MATERIALS_CACHE_FILE)) {
            try {
                const data = fs.readFileSync(MATERIALS_CACHE_FILE, 'utf8');
                this.materials = JSON.parse(data);
                // Rebuild materialNames
                this.materialNames = [];
                for (const jsonData of this.materials) {
                    for (const material of jsonData.results) {
                        this.materialNames.push(material['title']);
                    }
                }
                this.logger.info(`Loaded GPUOpen materials from cache: ${MATERIALS_CACHE_FILE}`);
                return this.materials;
            } catch (e) {
                this.logger.warn(`Failed to load GPUOpen materials cache: ${e.message}`);
            }
        }

        // 2. If not in cache, fetch from network
        this.materials = [];
        this.materialNames = [];

        let url = this.url;
        let params = new URLSearchParams({
            limit: batchSize,
            offset: 0
        });
        if (params) {
            url += '?' + params.toString();
        }

        let haveMoreMaterials = true;
        while (haveMoreMaterials) {
            try {
                console.log('Fetch materials from url:', url);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                this.materials.push(jsonData);
                for (const material of jsonData.results) {
                    this.materialNames.push(material['title']);
                }
                let nextURL = jsonData.next;
                if (nextURL) {
                    url = nextURL;
                    haveMoreMaterials = true;
                } else {
                    console.log('Finished fetching materials');
                    haveMoreMaterials = false;
                    break;
                }
            } catch (error) {
                this.logger.info(`Error: ${error.message}`);
                haveMoreMaterials = true;
            }
        }
        // Save to cache file after fetching
        try {
            fs.writeFileSync(MATERIALS_CACHE_FILE, JSON.stringify(this.materials, null, 2));
            this.logger.info(`Saved GPUOpen materials to cache: ${MATERIALS_CACHE_FILE}`);
        } catch (e) {
            this.logger.warn(`Failed to write GPUOpen materials cache: ${e.message}`);
        }
        return this.materials;
    }

    async downloadPackage(listNumber, materialNumber, packageId = 0) {
        if (this.materials === null || this.materials.length === 0) {
            return [null, null];
        }

        const jsonData = this.materials[listNumber];
        if (!jsonData) {
            return [null, null];
        }

        let jsonResults = null;
        let jsonResult = null;
        if ('results' in jsonData) {
            jsonResults = jsonData['results'];
            if (jsonResults.length <= materialNumber) {
                return [null, null];
            } else {
                jsonResult = jsonResults[materialNumber];
            }
        }

        if (!jsonResult) {
            return [null, null];
        }

        let jsonPackages = null;
        if ('packages' in jsonResult) {
            jsonPackages = jsonResult['packages'];
        }
        if (!jsonPackages) {
            return [null, null];
        }

        if (jsonPackages.length <= packageId) {
            return [null, null];
        }
        const packageIdValue = jsonPackages[packageId];

        if (!packageIdValue) {
            return [null, null];
        }

        const url = `${this.packageUrl}/${packageIdValue}/download`
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const title = jsonResult['title'];

        console.log(`- Loader: Downloaded package: ${title} from ${url}`);
        return [data, title];
    }

    /**
     * Find materials by name.
     * @param {string} materialName - Regular expression to match the material name.
     * @return {Array} - A list of materials that match the regular expression of the form:
     * [{ 'listNumber': listNumber, 'materialNumber': materialNumber, 'title': title }]
     */
    findMaterialsByName(materialName) 
    {
        if (!this.materials) {
            return [];
        }

        const materialsList = [];
        let listNumber = 0;

        // Create a RegExp object for case-insensitive matching
        const regex = new RegExp(materialName, 'i');

        this.materials.forEach((materialList, materialIndex) => {
            let materialNumber = 0;

            materialList['results'].forEach((material) => {

                //console.log('testing material:', material['title'], ' with regex:', regex)
                if (regex.test(material['title'])) {
                    materialsList.push({
                        listNumber: listNumber,
                        materialNumber: materialNumber,
                        title: material['title'],
                    });
                }
                materialNumber += 1;
            });

            listNumber += 1;
        });

        return materialsList;
    }

    /**
     * Download a material package by string expression.
     * @param {string} searchExpr - Regular expression to match the material name
     * @param {number} packageId - Index of the package in the material
     * @return {Array} - A list of material items that match the regular expression of the form:
     * [[data, title], [data, title], ...]
     * where data is the package data (in zip form) and title is the material title
     */
    async downloadPackageByExpression(searchExpr, packageId = 0) {
        const downloadList = [];

        const foundList = this.findMaterialsByName(searchExpr);
        if (foundList.length > 0) {
            for (const found of foundList) {
                const listNumber = found['listNumber'];
                const materialNumber = found['materialNumber'];
                const matName = found['title'];
                this.logger.info(`> Download material: ${matName} List: ${listNumber}. Index: ${materialNumber}`);
                const [data, title] = await this.downloadPackage(listNumber, materialNumber, packageId);
                downloadList.push([data, title]);
            }
        }
        return downloadList;
    }
}

// Export a singleton instance of the class
module.exports = new JsGPUOpenMaterialLoader();

