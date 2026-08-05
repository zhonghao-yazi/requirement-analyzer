/**
 * Excel 导出工具
 *
 * 使用 SheetJS (xlsx) 动态加载，仅在用户点击下载时加载
 */

/**
 * 将测试用例数据导出为 Excel 文件并触发下载
 *
 * @param {object[]} testCases  - 测试用例数组
 * @param {string}   fileName   - 文件名前缀
 */
export async function exportToExcel(testCases, fileName = '测试用例') {
  if (!testCases || testCases.length === 0) {
    throw new Error('没有可导出的测试用例数据')
  }

  let XLSX
  try {
    XLSX = await import('xlsx')
  } catch {
    throw new Error('Excel 导出模块加载失败，请刷新页面后重试')
  }

  const sheetData = [
    ['序号', '分类', '测试标题', '前置条件', '测试步骤', '预期结果'],
    ...testCases.map((tc) => [
      tc.id,
      tc.category,
      tc.title,
      tc.preconditions || '',
      tc.steps || '',
      tc.expected || '',
    ]),
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  ws['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 32 },
    { wch: 30 },
    { wch: 40 },
    { wch: 40 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, '测试用例')

  const timestamp = new Date().toISOString().slice(0, 10)
  const fullName = `${fileName}_${timestamp}.xlsx`

  try {
    XLSX.writeFile(wb, fullName)
  } catch {
    throw new Error('Excel 文件写入失败，请检查磁盘空间和权限')
  }
}
