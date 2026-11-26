# Get BillKit indexed for free

Use the exact project URL, **https://r69shabh.github.io/billkit/**, including its trailing slash. No custom domain, DNS change, or paid service is needed.

## 1. Verify with Google

1. Sign in to [Google Search Console](https://search.google.com/search-console/welcome) with the Google account that should own the property. Choose **URL prefix**, not **Domain**, and enter `https://r69shabh.github.io/billkit/`.
2. In the ownership dialog, choose **HTML tag** and copy the complete `<meta name="google-site-verification" ...>` tag. In `index.html`, replace the Google verification comment near the canonical link with that tag, directly inside `<head>`, outside any HTML comment. Commit the change to `main` or open and merge a small PR.
3. Wait for the [GitHub Pages deployment](https://github.com/r69shabh/billkit/actions/workflows/pages.yml). View the **page source** at the [live homepage](https://r69shabh.github.io/billkit/) and ensure the real tag is present and uncommented. Go back to Search Console and click **Verify**. Keep the tag in place after verification.
4. In **Sitemaps**, submit `sitemap.xml` under the project URL prefix (the full URL is [https://r69shabh.github.io/billkit/sitemap.xml](https://r69shabh.github.io/billkit/sitemap.xml)). Use **URL Inspection → Request indexing** for the homepage and the [freelance template](https://r69shabh.github.io/billkit/freelance-invoice-template.html), [USD guide](https://r69shabh.github.io/billkit/usd-invoice.html), and [PDF guide](https://r69shabh.github.io/billkit/pdf-invoice-maker.html).

## 2. Import into Bing

1. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters/), select **Add a Site → Import from Google Search Console**, authorize the Google account above, and select only the BillKit project property. This verifies ownership in Bing without a second code change.
2. In Bing’s **Sitemaps** report, check for the imported BillKit sitemap. If it’s missing, click **Submit sitemap** and enter `https://r69shabh.github.io/billkit/sitemap.xml`.
3. If you prefer not to link your Google account, choose **Add your site manually**, enter the same project URL, then choose **HTML Meta Tag**. Replace the separate Bing verification comment in `index.html` with Bing’s complete `<meta name="msvalidate.01" ...>` tag inside `<head>`. Deploy, confirm the live tag is uncommented, click **Verify**, leave it in place, and submit the sitemap.

## 3. Check coverage

- Crawlers read [the host’s root robots.txt](https://r69shabh.github.io/robots.txt), not the copy under `/billkit/`. The root returned `404` when checked, so it isn't blocking crawling. Submit the sitemap directly as above; there’s no need to change the host’s root site.
- Watch **Sitemaps** and **Page indexing** in Search Console and use **URL Inspection** to diagnose important URLs. Once they receive impressions, use **Performance → Search results** and Bing’s **Search Performance** to see which queries and pages are getting clicks. Sitemap submission and inspection requests do not guarantee indexing or rankings.

References: [Google site verification](https://support.google.com/webmasters/answer/9008080), [Google sitemap and recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Bing site verification and import](https://www4.bing.com/webmasters/help/add-and-verify-site-12184f8b).
