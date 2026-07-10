#!/usr/bin/env python3
"""Debug: check level select page."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await ctx.new_page()
        
        await page.goto("http://localhost:3457/", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        
        # Click Bermain
        btn = page.get_by_label("Bermain", exact=True)
        await btn.click()
        await page.wait_for_timeout(3000)
        
        # Screenshot
        await page.screenshot(path="/home/ubuntu/tebu/debug-levels.png")
        print("Screenshot saved")
        
        # Look for level buttons
        labeled = await page.query_selector_all("[aria-label]")
        print(f"Found {len(labeled)} aria-labeled elements:")
        for el in labeled:
            label = await el.get_attribute("aria-label")
            tag = await el.evaluate("el => el.tagName")
            print(f"  {tag} aria-label={label!r}")
        
        # Also check for text content
        all_text = await page.inner_text("body")
        print("\nPage text (first 1000 chars):", all_text[:1000])
        
        await browser.close()

asyncio.run(main())
