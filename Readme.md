# Jazmax

This is a crawler that reads the calculated JAZ for different heat pumps based on flow and return temperatures from <https://www.waermepumpe.de/jazrechner/>. The aggregated data is formatted, sorted by combined efficiency, and written to a local `data.json` file.

## Running

Install dependencies with `yarn install`.
Run `npx playwrite webkit` to download a headless webkit for crawling.

Change parameters in `jaz.ts` to match you desired temperatures and run with

```sh
yarn start
```
