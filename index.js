const chalk = require('chalk')
const inquirer = require('inquirer')
const TableInput = require('inquirer-table-input')
const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')

let xmls = {}

let config = {}
const loadConfig = async () => {
    return new Promise((resolve) => {
        fs.readFile('./config.json', 'utf8', (err, data) => {
            if (err) {
                console.error(err.message)
                return
            }
            try {
                config = JSON.parse(data)
                resolve()
            } catch (parseErr) {
                console.error('config.json not found')
            }
        })
    })
}

const getValueFromPath = (obj, xmlPath) => {
    const parts = xmlPath.replace(/\./g, '_').split('_')
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
    const parts = xmlPath.replace(/\./g, '_').split('_')
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
            return
        }
    }
}

const readAllFiles = (dirPath) => {
    const resultObject = {}
    return new Promise((resolve) => {
        fs.readdir(dirPath, (err, files) => {
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

const moveXMLProcessed = async (inputPath, processedPath) => {
    try {
        await fs.renameSync(inputPath, processedPath)
    } catch (error) {
        console.log(error)
    }
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
                await answers.editor.result.forEach(async (row) => {
                    const xmlName = row.__filename
                    const xml = xmls[xmlName]
                    await config.editor
                        .filter((item) => item.editable)
                        .forEach(async (field) => {
                            const newValue = row[field.value]
                            await setValueFromPath(xml, field.value, newValue)
                            await field.cloneTo.forEach(async (key) => {
                                await setValueFromPath(xml, key, newValue)
                            })
                            xmls[xmlName] = xml
                        })
                })
                Object.keys(xmls).forEach(async (xmlName) => {
                    const xml = xmls[xmlName]
                    const baseFileName = getValueFromPath(xml, config.outputFilename)
                    let fileName = baseFileName

                    if (config.outputFilenameExtra) {
                        const extraFileNamePart = getValueFromPath(xml, config.outputFilenameExtra)
                        if (extraFileNamePart) {
                            fileName = `${baseFileName}_${extraFileNamePart}`
                        }
                    }

                    fileName = fileName + '.xml'
                    const outputPath = path.join(config.outputDir, fileName)
                    await saveXMLToFile(xml, outputPath)

                    const inputPath = path.join(config.inputDir, xmlName)
                    const processedPath = path.join(config.processedDir, xmlName)
                    await moveXMLProcessed(inputPath, processedPath)
                })
                resolve()
            })
            .catch(() => {})
    })
}

const prepareColumnsTable = async () => {
    const columns = [
        ...[
            {
                name: 'Filename',
                value: '__filename',
            },
        ],
        ...config.editor,
    ]
    columns.forEach((row) => {
        row.value = row.value.replace(/\./g, '_')
    })
    return columns
}

const prepareRownsTable = async (columns) => {
    xmls = await readAllFiles(config.inputDir)
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
const validateAndPrepareObject = (obj) => {
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] === null || obj[key] === undefined) {
                obj[key] = ''
            } else if (typeof obj[key] === 'object') {
                validateAndPrepareObject(obj[key])
            }
        }
    }
    return obj
}

const convertObjectToXML = (obj) => {
    const preparedObj = validateAndPrepareObject(obj)
    const builder = new xml2js.Builder()
    const xml = builder.buildObject(preparedObj)
    return xml
}

const saveXMLToFile = async (xmls, filePath) => {
    const xml = await convertObjectToXML(xmls)
    await fs.writeFileSync(filePath, xml)
}

const prepareConfig = async () => {
    if (!fs.existsSync(config.outputDir)) {
        await fs.mkdirSync(config.outputDir, { recursive: true })
    }
    if (!fs.existsSync(config.processedDir)) {
        await fs.mkdirSync(config.processedDir, { recursive: true })
    }
}

//init
;(async () => {
    await loadConfig()
    await prepareConfig()
    const columns = await prepareColumnsTable()
    const rows = await prepareRownsTable(columns)
    await mountEditor(columns, rows)
})()
