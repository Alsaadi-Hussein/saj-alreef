import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const dir = './لقطات الشاشة'
const filePath = path.resolve('recommendations/SAJ ALREEF - النظام الرقمي المتكامل.html')
const fileUrl  = 'file:///' + filePath.replace(/\\/g, '/')

const browser = await puppeteer.launch({
  headless: false, // show browser to see what's happening
  args: ['--no-sandbox','--allow-file-access-from-files'],
  defaultViewport: null
})
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1.5 })
await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

// Wait for bundle to fully unpack
console.log('Waiting for app to load...')
await new Promise(r => setTimeout(r, 12000))

// Dump all clickable elements with text
const elements = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button, a, nav *, [role="tab"], [class*="tab"], [class*="nav"], [class*="menu"]'))
  return els.slice(0, 60).map(e => ({
    tag: e.tagName,
    text: e.textContent.trim().slice(0, 50),
    class: e.className?.slice?.(0, 80) || '',
    id: e.id
  })).filter(e => e.text.length > 0)
})

console.log('\n=== Clickable elements found ===')
elements.forEach(e => console.log(`[${e.tag}] "${e.text}" | class: ${e.class.slice(0,40)}`))

await page.screenshot({ path: path.join(dir, 'ref-debug-loaded.png'), fullPage: false })
console.log('\nSaved debug screenshot')

await browser.close()
