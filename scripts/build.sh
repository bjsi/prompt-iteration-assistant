rm -rf dist 

tsc
npm publish --dry-run

if [ ! -f dist/index.js ]
then
    echo
    echo "Build did not successfully generate dist/index.js"
    exit 1
fi

npm publish --dry-run 2>&1 >/dev/null | grep "package size" | grep -q "MB"
if [ $? -eq 0 ]
then
    echo
    echo "BUILD FAILED: npm package is too large."
    echo "Check if all files above should be published and if so adjust the limit."
    exit 1
fi