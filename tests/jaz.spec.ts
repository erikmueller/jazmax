import { test } from '@playwright/test'
import fs from 'fs'

type Temp = { flow: '55'; return: '45' } | { flow: '35'; return: '28' }

const temp: Temp = { flow: '55', return: '45' }
const heatSource = 'Luft'
const normTemp = '-13'

const removeMultiSpaces = (str: string) => str.replace(/\s{2,}/, ' ')
const toFloat = (value: string) => Number.parseFloat(value.replace(',', '.'))
const delay1s = () => new Promise((resolve) => window.setTimeout(resolve, 1000))

let result: Array<{
  pump: string
  manufacturer: string
  heat: number
  water: number
  combined: number
}> = []

test.afterAll(() => {
  fs.writeFileSync(
    './data.json',
    JSON.stringify(
      result.sort((a, b) => b.combined - a.combined),
      null,
      2
    )
  )
})

test('get JAZ', async ({ page }) => {
  await page.goto('https://www.waermepumpe.de/jazrechner/')

  const manufacturers = await page.$$eval(
    '#wp_hersteller > option',
    (manufacturer) =>
      // remove the first 3 (placeholder, custom, none)
      manufacturer.map(({ textContent }) => textContent).slice(5)
  )

  for (const manufacturer of manufacturers) {
    if (manufacturer === null) continue

    await page.selectOption('#wp_hersteller', removeMultiSpaces(manufacturer))
    await page.waitForFunction(delay1s)

    const sourceOptions = await page.$$eval(
      '#wp_waermequelle > option',
      (sources) => sources.map(({ textContent }) => textContent)
    )

    if (!sourceOptions.includes(heatSource)) continue

    await page.selectOption('#wp_waermequelle', heatSource)
    await page.waitForFunction(delay1s)

    const pumpOptions = await page.$$eval('#wp_waermepumpe > option', (pumps) =>
      pumps.map(({ textContent }) => textContent)
    )

    for (const pump of pumpOptions) {
      if (pump === null) continue

      // replace multi spaces as it breaks option selection
      await page.selectOption('#wp_waermepumpe', removeMultiSpaces(pump))
      await page.selectOption('#haus_vorlauftemp', temp.flow)
      await page.selectOption('#haus_ruecklauftemp', temp.return)
      await page.selectOption('#wp_normaussentemp', normTemp)

      await page.getByText('Aktualisieren').click()
      await page.waitForFunction(delay1s)

      const heat = toFloat(await page.locator('#jaz_heizbetrieb').inputValue())
      const water = toFloat(
        await page.locator('#jaz_wasserbereitung').inputValue()
      )
      const combined = toFloat(await page.locator('#jaz_gesamt').inputValue())

      result.push({ pump, manufacturer, heat, water, combined })

      console.log(`${manufacturer} ${pump}: ${combined}`)
    }
  }
})
