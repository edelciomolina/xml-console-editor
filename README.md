# xml-console-editor [![npm version](https://badge.fury.io/js/xml-console-editor.svg)](https://badge.fury.io/js/xml-console-editor)

## Description

This NPM package is an interactive XML editing tool for processing and transforming XML files. It uses libraries like
`chalk`, `inquirer`, `fs`, `path`, and `xml2js` to provide a user-friendly and efficient experience in manipulating XML
data.

## Features

-   **XML File Reading and Writing:** Facilitates the reading and writing of XML files, allowing for complex data
    manipulations.
-   **Interactive Table Interface:** Utilizes `inquirer` with a custom prompt for editing data in an interactive table
    format.
-   **Customizable Configuration:** Allows users to define specific settings through a `config.json` file.

## Configuration (`config.json`)

> See an example in [config.sample.json](config.sample.json)

### Parameters

-   **inputDir:** The input directory for XML files to be processed.
-   **outputDir:** The output directory for processed XML files.
-   **outputFilename:** The filename to save the processed XML into outputDir.
-   **processedDir:** The directory to move processed XML files to.
-   **title:** The title of the editor interface.
-   **message:** An informative message displayed in the interface.
-   **freezeColumns:** The number of columns to freeze in the table view.
-   **editor:** An array of objects defining editable columns and their paths in the XML.
    -   **editable:** Boolean indicating if the column is editable.
    -   **value:** The path of the value in the XML.
    -   **cloneTo:** An array of paths in the XML to duplicate the edited value.

## Workflow

1. **Initialization:** Preparation of directories and configurations.
2. **Reading XML Files:** Reads all XML files from the input directory.
3. **Assembling the Editing Table:** Creates a table interface based on the configurations and read data.
4. **Interactive Editing:** Allows for interactive editing of data in the table.
5. **Data Processing:** Applies changes to the XML data.
6. **Saving and Moving Files:** Saves the modified XML files in the output directory and moves the originals to the
   processed directory.

## Installation and Execution

```bash
npm install --save xml-console-editor
```
