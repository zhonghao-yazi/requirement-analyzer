import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })

const fi = page.locator('input[type="file"]')
await fi.setInputFiles(path.resolve(__dirname, 'tests', 'test-data', 'test_sample.txt'))
await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
await page.waitForFunction(() => !document.body.innerText.includes('正在解析'), { timeout: 30000 }).catch(() => {})

const info = await page.evaluate(() => {
  const canvas = document.querySelector('[class*="canvas"]')
  const wrapper = canvas?.parentElement
  const card = wrapper?.parentElement

  const getOverflow = (el) => {
    if (!el) return 'N/A'
    const s = window.getComputedStyle(el)
    return `overflow:${s.overflow} x:${s.overflowX} y:${s.overflowY}`
  }

  const nodes = document.querySelectorAll('[class*="node"]')
  const firstNode = nodes[0]
  const firstNodeInfo = firstNode ? {
    top: firstNode.style.top,
    left: firstNode.style.left,
    width: firstNode.style.width,
    height: firstNode.style.minHeight,
    computedTop: window.getComputedStyle(firstNode).top,
    computedPosition: window.getComputedStyle(firstNode).position,
    transform: window.getComputedStyle(firstNode).transform,
  } : 'N/A'

  return {
    card: { tag: card?.tagName, className: card?.className?.substring(0, 50), overflow: getOverflow(card) },
    wrapper: { tag: wrapper?.tagName, className: wrapper?.className?.substring(0, 50), overflow: getOverflow(wrapper), height: wrapper ? window.getComputedStyle(wrapper).height : 'N/A' },
    canvas: { className: canvas?.className?.substring(0, 50), overflow: getOverflow(canvas), paddingTop: canvas ? window.getComputedStyle(canvas).paddingTop : 'N/A', styleHeight: canvas?.style?.height },
    firstNode: firstNodeInfo,
    totalNodes: nodes.length,
  }
})

console.log(JSON.stringify(info, null, 2))
await browser.close()
