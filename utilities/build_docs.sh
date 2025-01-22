pushd .
cd documents
echo "----------- Build documentation -----------"
doxygen Doxyfile
echo "----------- Documentation Warnings -----------"
if [ -f doxygen_warnings.txt ]; then
    rm doxygen_warnings.txt 
fi
popd
