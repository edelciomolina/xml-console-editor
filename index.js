const chalk = require('chalk')
const inquirer = require('inquirer')
const TableInput = require('inquirer-table-input')
const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const config = require('./config.json')

let xmls = {}

const getValueFromPath = (obj, xmlPath) => {
    const parts = xmlPath.replace('.', '_').split('_')
    let value = obj
    for (const parte of parts) {
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

const setValueFromPath = (obj, xmlPath, newValue) => {
    const parts = xmlPath.replace('.', '_').split('_')
    let value = obj
    for (let i = 0; i < parts.length; i++) {
        const parte = parts[i]
        if (value && Object.prototype.hasOwnProperty.call(value, parte)) {
            if (i === parts.length - 1) {
                if (Array.isArray(value[parte])) {
                    value[parte] = [newValue]
                } else {
                    value[parte] = newValue
                }
            } else {
                value = value[parte]
                if (Array.isArray(value)) {
                    value = value[0]
                }
            }
        } else {
            // Se o caminho não existe, saia da função sem fazer alterações
            return
        }
    }
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
    return new Promise((resolve) => {
        inquirer.registerPrompt('table-input', TableInput)

        inquirer
            .prompt([
                {
                    type: 'table-input',
                    name: 'editor',
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
            .then(async (answers) => {
                answers.editor.result.forEach((row) => {
                    config.editor
                        .filter((item) => item.editable)
                        .forEach((field) => {
                            Object.keys(xmls).forEach(async (xmlName) => {
                                const xml = xmls[xmlName]
                                setValueFromPath(xml, field.value, row[field.value])
                                field.cloneTo.forEach((key) => {
                                    setValueFromPath(xml, key, row[key])
                                })
                                xmls[xmlName] = xml

                                const outputPath = path.join(config.directory, `${xmlName}.new.xml`)
                                await saveXMLToFile(xml, outputPath)
                            })
                        })
                })
            })
            .catch(() => {})
    })
}

const prepareColumnsTable = async () => {
    const columns = config.editor
    columns.forEach((row) => {
        row.value = row.value.replace(/\./g, '_')
    })
    return columns
}

const prepareRownsTable = async (columns) => {
    xmls = await readAllFiles(config.directory)
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

const convertObjectToXML = (obj) => {
    const builder = new xml2js.Builder()
    const xml = builder.buildObject(obj)
    return xml
}

const writeXMLToFile = async (xml, filePath) => {
    await fs.writeFileSync(filePath, xml)
}
const saveXMLToFile = async (xmls, filePath) => {
    const xml = convertObjectToXML(xmls)
    await writeXMLToFile(xml, filePath)
}

//init
;(async () => {
    const columns = await prepareColumnsTable()
    const rows = await prepareRownsTable(columns)
    await mountEditor(columns, rows)
})()
