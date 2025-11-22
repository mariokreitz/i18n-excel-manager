/**
 * @module io/excel
 * Excel workbook read/write helpers wrapping ExcelJS.
 */

/**
 * Excel file input/output utilities.
 * Handles reading and writing Excel workbooks using ExcelJS.
 */

/**
 * Reads an Excel file into the provided workbook object.
 * @param {string} filePath - Path to the Excel file to read.
 * @param {Object} workbook - ExcelJS workbook object to populate.
 * @returns {Promise<void>} Resolves when the file is read.
 * @throws {Error} If file reading fails.
 */
export async function readWorkbook(filePath, workbook) {
  await workbook.xlsx.readFile(filePath);
}

/**
 * Write an Excel workbook to disk.
 * @param {string} filePath Destination file path.
 * @param {Object} workbook ExcelJS Workbook instance.
 * @returns {Promise<void>}
 */
export async function writeWorkbook(filePath, workbook) {
  await workbook.xlsx.writeFile(filePath);
}
