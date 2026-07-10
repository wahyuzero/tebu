#!/usr/bin/env python3
"""Debug: check level select page elements."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await ctx.new_page()
        
        await page.goto("http://localhost:3457/", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        
        # Click Bermain with force
        bermain = page.get_by_label("Bermain", exact=True)
        await bermain.wait_for(state="visible", timeout=10000)
        await bermain.click(force=True)
        await page.wait_for_timeout(3000)
        
        # Screenshot after clicking Bermain
        await page.screenshot(path="/home/ubuntu/tebu/debug-after-bermain.png")
        print("Screenshot saved")
        
        # Look for aria-labeled elements
        labeled = await page.query_selector_all("[aria-label]")
        print(f"Found {len(labeled)} aria-labeled elements:")
        for el in labeled:
            label = await el.get_attribute("aria-label")
            tag = await el.evaluate("el => el.tagName")
            vis = await el.is_visible()
            print(f"  {tag} aria-label={label!r} visible={vis}")
        
        # Look for buttons specifically
        buttons = await page.query_selector_all("button")
        print(f"\nFound {len(buttons)} buttons:")
        for btn in buttons:
            label = await btn.get_attribute("aria-label")
            text = (await btn.inner_text()).strip()[:60]
            vis = await btn.is_visible()
            print(f"  aria-label={label!r} text={text!r} visible={vis}")
        
        # Check page text
        text = await page.inner_text("body")
        print(f"\nPage text (first 500): {text[:500]}")
        
        await browser.close()

asyncio.run(main())
