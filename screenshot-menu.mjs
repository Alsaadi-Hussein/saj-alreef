import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const dir = './لقطات الشاشة'
if (!fs.existsSync(dir)) fs.mkdirSync(dir)

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] })
const page    = await browser.newPage()
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 })
await new Promise(r => setTimeout(r, 3000))

// Click المنيو tab (second tab)
const tabs = await page.$$('button')
for (const tab of tabs) {
  const text = await tab.evaluate(el => el.textContent?.trim())
  if (text === 'المنيو') { await tab.click(); break }
}
// Wait for menu items to load (watch for img or item cards)
await new Promise(r => setTimeout(r, 5000))
await page.screenshot({ path: path.join(dir, 'screenshot-2-menu.png'), fullPage: false })
console.log('Menu screenshot saved')

// Click سلتي tab
for (const tab of await page.$$('button')) {
  const text = await tab.evaluate(el => el.textContent?.trim())
  if (text === 'سلتي') { await tab.click(); break }
}
await new Promise(r => setTimeout(r, 500))
await page.screenshot({ path: path.join(dir, 'screenshot-3-cart.png'), fullPage: false })
console.log('Cart screenshot saved')

await browser.close()
