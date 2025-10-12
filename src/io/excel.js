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
 * Writes the workbook to an Excel file.
 * @param {string} filePath - Path where the Excel file will be written.
 * @param {Object} workbook - ExcelJS workbook object to write.
 * @returns {Promise<void>} Resolves when the file is written.
 * @throws {Error} If file writing fails.
 */
export async function writeWorkbook(filePath, workbook) {
  await workbook.xlsx.writeFile(filePath);
}
