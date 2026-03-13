require('dotenv').config();
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>
  res.send('TBP SeaRates Server is UP and RUNNING!')
);

app.get('/api/rates', async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      error: 'Missing required query parameters: from and to (port IDs)',
    });
  }

  const platformId = process.env.SEARATES_PLATFORM_ID || '40275';
  const apiKey = process.env.SEARATES_API_KEY || '';

  if (!apiKey) {
    return res.status(500).json({ error: 'SEARATES_API_KEY not configured' });
  }

  const tokenUrl = `https://www.searates.com/auth/platform-token?id=${platformId}&api_key=${apiKey}`;

  let browser;

  try {
    const launchOpts = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    };
    browser = await puppeteer.launch(launchOpts);

    const page = await browser.newPage();

    await page.goto(tokenUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const sToken = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      try {
        const data = JSON.parse(bodyText);
        return data.token || data['s-token'] || null;
      } catch {
        const match = bodyText.match(/"token"\s*:\s*"([^"]+)"/) ||
          bodyText.match(/"s-token"\s*:\s*"([^"]+)"/);
        return match ? match[1] : null;
      }
    });

    if (!sToken) {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      return res.status(500).json({
        error: 'Failed to obtain s-token from SeaRates',
      });
    }

    const graphqlQuery = `query { rates(shippingType: FCL, pointIdFrom: "${from}", pointIdTo: "${to}", container: ST20, date: "2026-03-20") { general { totalPrice totalCurrency validityFrom validityTo totalTransitTime } points { shippingType provider distance pointTotal routeTotal co2 { amount } routeTariff { name abbr price currency } pointTariff { name abbr price currency } location { name } } } }`;

    const graphqlData = await page.evaluate(
      async ({ url, token, query }) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query }),
        });
        return response.json();
      },
      {
        url: 'https://rates.searates.com/graphql',
        token: sToken,
        query: graphqlQuery,
      }
    );

    await browser.close();
    browser = null;

    res.json(graphqlData);
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    console.error('Rates API error:', err);
    res.status(500).json({
      error: 'Failed to fetch rates',
      message: err.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
