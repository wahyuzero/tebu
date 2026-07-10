#!/usr/bin/env python3
"""Debug: check what's on the TEBU home page."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await ctx.new_page()
        
        await page.goto("http://localhost:3457/", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        
        # Screenshot
        await page.screenshot(path="/home/ubuntu/tebu/debug-home.png")
        print("Screenshot saved to /home/ubuntu/tebu/debug-home.png")
        
        # Get page content
        content = await page.content()
        print("Page title:", await page.title())
        print("Content length:", len(content))
        
        # Look for buttons/links
        buttons = await page.query_selector_all("button")
        print(f"\nFound {len(buttons)} buttons:")
        for btn in buttons:
            label = await btn.get_attribute("aria-label")
            text = await btn.inner_text()
            print(f"  aria-label={label!r}, text={text!r}")
        
        # Look for all elements with aria-label
        labeled = await page.query_selector_all("[aria-label]")
        print(f"\nFound {len(labeled)} aria-labeled elements:")
        for el in labeled:
            label = await el.get_attribute("aria-label")
            print(f"  aria-label={label!r}")
        
        # Look for any clickable elements
        links = await page.query_selector_all("a")
        print(f"\nFound {len(links)} links")
        
        await browser.close()

asyncio.run(main())
