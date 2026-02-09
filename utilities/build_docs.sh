pushd .
echo "----------- Prep Mermaid -----------"
cp nodejs/materialxLibraryInspector/README.md nodejs/materialxLibraryInspector/README.md.orig
python utilities/mermaid_prep.py nodejs/materialxLibraryInspector/README.md.orig nodejs/materialxLibraryInspector/README.md 
python utilities/mermaid_prep.py nodejs/materialxLibraryInspector/README.md.orig nodejs/materialxLibraryInspector/README_dox.md 
echo "----------- Build documentation -----------"
cd documents
doxygen Doxyfile
echo "----------- Documentation Warnings -----------"
if [ -f doxygen_warnings.txt ]; then
    rm doxygen_warnings.txt 
fi
popd
echo "----------- Restore Mermaid -----------"
cp nodejs/materialxLibraryInspector/README.md.orig nodejs/materialxLibraryInspector/README.md
