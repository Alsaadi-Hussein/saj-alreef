import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const dir = './لقطات الشاشة'
if (!fs.existsSync(dir)) fs.mkdirSync(dir)

const filePath = path.resolve('recommendations/SAJ ALREEF - النظام الرقمي المتكامل.html')
const fileUrl  = 'file:///' + filePath.replace(/\\/g, '/')

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
})
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1.5 })

console.log('Opening reference file...')
await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

// Wait for the bundler to unpack and render
await new Promise(r => setTimeout(r, 8000))
await page.screenshot({ path: path.join(dir, 'ref-01-full.png'), fullPage: true })
console.log('Saved ref-01-full.png')

// Try clicking each tab in the top nav if visible
const navLabels = ['📱 الزبون', '🍳 المطبخ', '👨‍🍽️ النادل', '📊 الإدارة']
for (let idx = 0; idx < navLabels.length; idx++) {
  try {
    await page.evaluate((label) => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find(b => b.textContent.trim().includes(label.replace(/^[^\s]+\s/, '')))
      if (btn) btn.click()
    }, navLabels[idx])
    await new Promise(r => setTimeout(r, 1000))
    await page.screenshot({ path: path.join(dir, `ref-0${idx+2}-${['customer','kitchen','waiter','admin'][idx]}.png`), fullPage: true })
    console.log(`Saved ref-0${idx+2}`)
  } catch(e) { console.log('skip', idx, e.message) }
}

// Customer sub-tabs
const subTabs = ['تتبع','المنيو','سلتي','الحساب','تقييم']
for (let i = 0; i < subTabs.length; i++) {
  try {
    await page.evaluate((label) => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find(b => b.textContent.trim() === label)
      if (btn) btn.click()
    }, subTabs[i])
    await new Promise(r => setTimeout(r, 800))
    await page.screenshot({ path: path.join(dir, `ref-customer-${i+1}-${subTabs[i]}.png`), fullPage: false })
    console.log(`Saved customer sub-tab: ${subTabs[i]}`)
  } catch(e) {}
}

await browser.close()
console.log('\nDone — all reference screenshots saved to لقطات الشاشة/')
