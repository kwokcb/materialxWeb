#!/usr/bin/env bash
#
# @brief Test that ambientCG access and queries work via the JS loader.
#
# Usage:
#   bash test_ambientcg.sh                  # quick test (uses cached data)
#   bash test_ambientcg.sh refresh          # force refetch from the network first
#   bash test_ambientcg.sh refresh download # refetch AND download a real package
#
# Exit code is 0 if all tests pass, non-zero otherwise.
set -euo pipefail

# Resolve the folder containing this script and run from there so the
# loader's relative requires (./JsAmbientCGLoader) and cache files resolve.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DO_REFRESH=0
DO_DOWNLOAD=0
for arg in "$@"; do
    case "$arg" in
        refresh)  DO_REFRESH=1 ;;
        download) DO_DOWNLOAD=1 ;;
    esac
done

if [ "$DO_REFRESH" = "1" ]; then
    echo "Refreshing ambientCG cache/database (network fetch)..."
    rm -f ambientcg_materials.json ambientcg_database.json
fi

export DO_DOWNLOAD

echo "=== ambientCG loader test ==="
echo "(apiVersion default: v3)"

node <<'NODE'
const assert = require('assert');
const loader = require('./JsAmbientCGLoader');

const TEST_ASSET = 'WoodFloor038';
const TARGET_ATTRIBUTE = '1K-PNG';
const doDownload = process.env.DO_DOWNLOAD === '1';

(async () => {
    let failures = 0;
    const check = (name, cond, extra) => {
        if (cond) { console.log(`PASS: ${name}`); }
        else { failures++; console.error(`FAIL: ${name}${extra ? ' -> ' + extra : ''}`); }
    };

    // 1. Fetch / load the materials list
    const list = await loader.downloadMaterialsList();
    check('downloadMaterialsList returns an array', Array.isArray(list));
    check('materials list has > 0 assets', Array.isArray(list) && list.length > 0, `count=${Array.isArray(list) ? list.length : 'n/a'}`);
    check('assets use v3 structure (id + downloads)',
        Array.isArray(list) && list.length > 0 && !!list[0].id && Array.isArray(list[0].downloads));

    // 2. Find a specific material by id
    const match = loader.findMaterial(TEST_ASSET);
    check(`findMaterial('${TEST_ASSET}') finds it`, match.length === 1, `count=${match.length}`);

    // 3. Resolve a download variant URL from the nested downloads array
    let url = '';
    if (match.length > 0) {
        const dl = (match[0].downloads || []).find(d => d.attributes === TARGET_ATTRIBUTE);
        url = dl ? dl.url : '';
        check(`download variant ${TARGET_ATTRIBUTE} resolves`, !!url, url || 'no url');
    }

    // 4. getMaterialNames returns the fetched ids
    const names = loader.getMaterialNames();
    check('getMaterialNames is non-empty', names.length > 0, `count=${names.length}`);

    // 5. Default API version is v3
    check('default apiVersion is v3', loader.apiVersion === 'v3', loader.apiVersion);

    // 6. Fetch the asset database and persist it back (so "refresh" leaves the file regenerated)
    const db = await loader.downloadAssetDatabase();
    loader.writeDatabaseToFile('ambientcg_database.json');
    const dbAssets = (db && db.assets) || [];
    check('downloadAssetDatabase returns an object', !!db && typeof db === 'object');
    check('database has assets', Array.isArray(dbAssets) && dbAssets.length > 0, `count=${dbAssets.length}`);

    // 7. Optionally perform a real package download (guarded so the quick test stays fast)
    if (doDownload && url) {
        const fileName = await loader.downloadMaterialAsset(TEST_ASSET, 'PNG', '1');
        check(`downloadMaterialAsset('${TEST_ASSET}') returns a filename`, !!fileName, fileName);
    } else {
        console.log('SKIP: real package download (pass "download" to enable)');
    }

    console.log('');
    if (failures > 0) {
        console.error(`${failures} ambientCG test(s) FAILED`);
        process.exit(1);
    }
    console.log('All ambientCG tests PASSED.');
})();
NODE
