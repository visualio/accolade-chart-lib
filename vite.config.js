const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/main.js'),
            name: 'accolade-chart-lib',
            fileName: (format) => `accolade-chart-lib.${format}.js`
        }
    }
})
