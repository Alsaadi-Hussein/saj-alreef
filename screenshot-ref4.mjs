import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const dir = './لقطات الشاشة'
const filePath = path.resolve('recommendations/SAJ ALREEF - النظام الرقمي المتكامل.html')
const fileUrl  = 'file:///' + filePath.replace(/\\/g, '/')

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox','--allow-file-access-from-files']
})
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1.5 })
await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
await new Promise(r => setTimeout(r, 12000))

async function clickNavTab(textFragment) {
  await page.evaluate((t) => {
    const tabs = Array.from(document.querySelectorAll('.nav-tab'))
    const tab = tabs.find(el => el.textContent.trim().includes(t))
    if (tab) tab.click()
  }, textFragment)
  await new Promise(r => setTimeout(r, 1500))
}

async function clickSidebar(textFragment) {
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('.sidebar-item, .sidebar a, [class*="sidebar"] li, [class*="sidebar"] div'))
    const item = items.find(el => el.textContent.trim().includes(t))
    if (item) item.click()
  }, textFragment)
  await new Promise(r => setTimeout(r, 1500))
}

async function clickAny(textFragment) {
  await page.evaluate((t) => {
    const all = Array.from(document.querySelectorAll('*'))
    const el = all.find(e => e.children.length === 0 && e.textContent.trim() === t)
    if (el) el.click()
  }, textFragment)
  await new Promise(r => setTimeout(r, 1500))
}

async function shot(name) {
  await page.screenshot({ path: path.join(dir, `REF-${name}.png`), fullPage: false })
  console.log(`✓ REF-${name}.png`)
}

// 1. Admin dashboard (default)
await shot('01-admin-dashboard')

// 2. Customer app
await clickNavTab('تطبيق الزبون')
await shot('02-customer-main')

// Customer sub-tabs
const subTabs = [
  { click: 'تتبع',   name: '03-customer-tracking' },
  { click: 'المنيو', name: '04-customer-menu'     },
  { click: 'سلتي',   name: '05-customer-cart'     },
  { click: 'الحساب', name: '06-customer-bill'     },
  { click: 'تقييم',  name: '07-customer-rating'   },
]
for (const t of subTabs) {
  await page.evaluate((txt) => {
    const btns = Array.from(document.querySelectorAll('button, div, span'))
    const el = btns.find(e => e.children.length === 0 && e.textContent.trim() === txt)
    if (el) el.click()
  }, t.click)
  await new Promise(r => setTimeout(r, 1000))
  await shot(t.name)
}

// 3. Kitchen
await clickNavTab('المطبخ')
await shot('08-kitchen')

// 4. POS
await clickNavTab('POS')
await shot('09-pos')

// 5. Reservations
await clickNavTab('الحجوزات')
await shot('10-reservations')

// 6. Admin sidebar items
await clickNavTab('لوحة الإدارة')
await new Promise(r => setTimeout(r, 1000))

const sidebarItems = [
  { click: 'إدارة القائمة', name: '11-admin-menu-mgmt' },
  { click: 'العروض',        name: '12-admin-offers'    },
  { click: 'المبيعات',      name: '13-admin-sales'     },
  { click: 'إنهاء الوردية', name: '14-admin-shift'     },
  { click: 'الحجوزات',      name: '15-admin-reservations' },
]
for (const s of sidebarItems) {
  await page.evaluate((txt) => {
    const all = Array.from(document.querySelectorAll('*'))
    const el = all.find(e => e.children.length === 0 && e.textContent.trim().includes(txt))
    if (el) el.click()
  }, s.click)
  await new Promise(r => setTimeout(r, 1500))
  await shot(s.name)
}

await browser.close()
console.log('\nAll done!')
