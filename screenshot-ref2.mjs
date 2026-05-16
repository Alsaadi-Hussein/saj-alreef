import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const dir = './لقطات الشاشة'
const filePath = path.resolve('recommendations/SAJ ALREEF - النظام الرقمي المتكامل.html')
const fileUrl  = 'file:///' + filePath.replace(/\\/g, '/')

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--allow-file-access-from-files']
})
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1.5 })
await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
await new Promise(r => setTimeout(r, 10000)) // wait for bundle to unpack

// Helper to click by text content
async function clickText(text) {
  return page.evaluate((t) => {
    const all = Array.from(document.querySelectorAll('button, a, [role="button"], li, div[onclick], span'))
    const el = all.find(e => e.textContent.trim().includes(t))
    if (el) { el.click(); return true }
    return false
  }, text)
}

async function shot(name) {
  await new Promise(r => setTimeout(r, 1500))
  await page.screenshot({ path: path.join(dir, `ref-${name}.png`), fullPage: false })
  console.log(`✓ ref-${name}.png`)
}

// Screenshot admin (default)
await shot('admin-dashboard')

// Click customer app in top nav
await clickText('تطبيق الزبون')
await shot('customer-view')

// Click المطبخ
await clickText('المطبخ')
await shot('kitchen-view')

// Click POS
await clickText('POS')
await shot('pos-view')

// Click الحجوزات
await clickText('الحجوزات')
await shot('reservations-view')

// Go back to customer, click sub-tabs
await clickText('تطبيق الزبون')
await new Promise(r => setTimeout(r, 1000))

const customerTabs = ['تتبع','المنيو','سلتي','الحساب','تقييم']
for (const t of customerTabs) {
  await clickText(t)
  await shot(`customer-${t}`)
}

// Admin sidebar items
await clickText('لوحة التحكم')
await shot('admin-home')

await clickText('إدارة القائمة')
await shot('admin-menu')

await clickText('العروض')
await shot('admin-offers')

await clickText('المبيعات')
await shot('admin-sales')

await clickText('إنهاء الوردية')
await shot('admin-shift')

await browser.close()
console.log('\nAll reference screenshots done!')
