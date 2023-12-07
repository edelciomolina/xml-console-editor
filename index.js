const chalk = require('chalk')
const inquirer = require('inquirer')
const TableInput = require('inquirer-table-input')
const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const config = require('./config.json')

const getValueFromPath = (obj, xmlPath) => {
    const partes = xmlPath.split('_')
    let value = obj
    for (const parte of partes) {
        if (value && Object.prototype.hasOwnProperty.call(value, parte)) {
            value = value[parte]
            if (Array.isArray(value)) {
                value = value[0]
            }
        } else {
            return undefined
        }
    }
    return value
}

const readAllFiles = (dirPath) => {
    const resultObject = {}
    return new Promise((resolve) => {
        fs.readdir(dirPath, (err, files) => {
            if (err) console.error('Erro ao listar arquivos:', err)

            const xmlFiles = files.filter((file) => path.extname(file).toLowerCase() === '.xml')
            xmlFiles.forEach((xmlFile) => {
                const filePath = path.join(dirPath, xmlFile)

                fs.readFile(filePath, 'utf-8', (readErr, data) => {
                    if (!readErr) {
                        xml2js.parseString(data, (parseError, result) => {
                            if (!parseError) {
                                resultObject[xmlFile] = result
                                if (Object.keys(resultObject).length === xmlFiles.length) {
                                    resolve(resultObject)
                                }
                            }
                        })
                    }
                })
            })
        })
    })
}

const mountEditor = (columns, rows) => {
    inquirer.registerPrompt('table-input', TableInput)

    inquirer
        .prompt([
            {
                type: 'table-input',
                name: 'pricing',
                message: config.title,
                infoMessage: config.message,
                hideInfoWhenKeyPressed: true,
                freezeColumns: config.freezeColumns,
                decimalPoint: '.',
                decimalPlaces: 2,
                selectedColor: chalk.yellow,
                editableColor: chalk.bgYellow.bold,
                editingColor: chalk.bgGreen.bold,
                columns,
                rows,
                validate: () => false,
            },
        ])
        .then((answers) => {
            console.log(answers)
        })
        .catch(() => {})
}

const prepareColumnsTable = async () => {
    const columns = config.editor
    columns.forEach((row) => {
        row.value = row.value.replace(/\./g, '_')
        delete row.cloneTo
    })
    return columns
}

const prepareRownsTable = async (columns) => {
    const xmls = await readAllFiles(config.directory)
    const rows = []

    Object.keys(xmls).forEach((filename) => {
        const data = xmls[filename]
        const row = []
        columns.forEach((column) => {
            if (column.value.startsWith('__')) {
                row.push(filename)
            } else {
                row.push(getValueFromPath(data, column.value))
            }
        })
        rows.push(row)
    })

    return rows
}
//init
;(async () => {
    const columns = await prepareColumnsTable()
    const rows = await prepareRownsTable(columns)
    await mountEditor(columns, rows)
})()
