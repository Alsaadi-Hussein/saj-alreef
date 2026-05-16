import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const url   = process.argv[2] || 'http://localhost:5173'
const label = process.argv[3] || ''

const dir = './لقطات الشاشة'
if (!fs.existsSync(dir)) fs.mkdirSync(dir)

const existing = fs.readdirSync(dir).filter(f => f.endsWith('.png'))
const nums = existing.map(f => parseInt(f.match(/(\d+)/)?.[1] ?? '0')).filter(n => !isNaN(n))
const n = nums.length ? Math.max(...nums) + 1 : 1
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`
const outPath = path.join(dir, filename)

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] })
const page    = await browser.newPage()
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
await new Promise(r => setTimeout(r, 1500))
await page.screenshot({ path: outPath, fullPage: false })
await browser.close()
console.log(`Saved: ${outPath}`)
