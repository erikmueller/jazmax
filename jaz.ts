import { test } from '@playwright/test'
import fs from 'fs'

const temp:
  | { flow: '35'; return: '28' }
  | { flow: '50'; return: '43' }
  | { flow: '55'; return: '45' }
  | { flow: '60'; return: '53' } = { flow: '55', return: '45' }
const heatSource = 'Luft'
const normTemp = '-13'
const blacklist = [
  'Clivet', // empty
  'MAXA', // empty
  'Mitsubishi Electric', // R32/490
  'Kermi GmbH', // R32
  'Panasonic', // R32
  'Pollmann Technik', // R32
  'Nilan GmbH', // Luft/Luft
  'Aereco', // Luft/Luft
]

let result: Array<{
  pump: string
  manufacturer: string
  heat: number
  water: number
  combined: number
}> = []

const removeMultiSpaces = (str: string) => str.replace(/\s{2,}/, ' ')
const toFloat = (value: string) => Number.parseFloat(value.replace(',', '.'))
const toText = (els: HTMLElement[]) => els.map(({ textContent }) => textContent)

const stats = {
  manufacturers: 0,
  models: 0,
}

test.afterAll(() => {
  fs.writeFileSync(
    `./data_${temp.flow}_${temp.return}_${new Date().toISOString()}.json`,
    JSON.stringify(
      result
        .filter(({ combined }) => !isNaN(combined))
        .sort((a, b) => b.combined - a.combined),
      null,
      2
    )
  )

  console.info(
    `\n\nChecked ${stats.models} heatpumps across ${stats.manufacturers} manufacturers.`
  )
})

test('get JAZ', async ({ page }) => {
  await page.goto('https://www.waermepumpe.de/jazrechner/')

  const manufacturers = await page.$$eval(
    '#wp_hersteller > option',
    (manufacturer) =>
      // remove the first 3 (placeholder, custom, none)
      manufacturer.map(({ textContent }) => textContent).slice(3)
  )

  for (const manufacturer of manufacturers) {
    if (manufacturer === null || blacklist.includes(manufacturer)) continue

    // replace multi spaces as it breaks option selection
    await page.selectOption('#wp_hersteller', removeMultiSpaces(manufacturer))
    await page.waitForTimeout(250)

    const sourceOptions = await page.$$eval('#wp_waermequelle > option', toText)

    if (!sourceOptions.includes(heatSource)) continue

    await page.selectOption('#wp_waermequelle', heatSource)
    await page.waitForTimeout(250)

    const pumpOptions = await page.$$eval('#wp_waermepumpe > option', toText)

    stats.manufacturers += 1

    for (const pump of pumpOptions) {
      if (pump === null) continue

      // replace multi spaces as it breaks option selection
      await page.selectOption('#wp_waermepumpe', removeMultiSpaces(pump))

      await page.selectOption('#haus_vorlauftemp', temp.flow)
      await page.selectOption('#haus_ruecklauftemp', temp.return)
      await page.selectOption('#wp_normaussentemp', normTemp)

      await page.getByText('Aktualisieren').click()

      await page.waitForTimeout(250)
      const heat = toFloat(await page.locator('#jaz_heizbetrieb').inputValue())
      const water = toFloat(
        await page.locator('#jaz_wasserbereitung').inputValue()
      )
      const combined = toFloat(await page.locator('#jaz_gesamt').inputValue())

      result.push({ pump, manufacturer, heat, water, combined })

      stats.models += 1

      console.log(`${manufacturer} ${pump}: ${combined}`)
    }
  }
})
