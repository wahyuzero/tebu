#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright

async def main():
    viewports = [
        ("phone", 375, 667),
        ("tablet", 768, 1024),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, w, h in viewports:
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await page.goto("http://localhost:3458")
            await page.wait_for_timeout(3000)
            await page.evaluate('document.querySelector(\'button[aria-label="Bermain"]\')?.click()')
            await page.wait_for_timeout(1000)
            await page.evaluate('document.querySelector(\'button[aria-label="Level 1"]\')?.click()')
            await page.wait_for_timeout(2000)
            await page.screenshot(path=f"/home/ubuntu/tebu/timer-{name}.png")
            await context.close()
        await browser.close()

asyncio.run(main())
