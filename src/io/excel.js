export async function readWorkbook(filePath, workbook) {
  await workbook.xlsx.readFile(filePath);
}

export async function writeWorkbook(filePath, workbook) {
  await workbook.xlsx.writeFile(filePath);
}
