import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local index.html
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for page load
        page.wait_for_load_state("networkidle")

        # Close announcement modal if visible
        if page.locator("#announcement-modal").is_visible():
            print("Closing announcement modal...")
            page.click("#announcement-ok-btn")
            page.wait_for_timeout(500) # Wait for animation

        # 1. Check Arrow Size Max
        arrow_slider = page.locator("#arrow-size-slider")
        max_val = arrow_slider.get_attribute("max")
        print(f"Arrow Slider Max: {max_val}")

        # 2. Check Line Thickness Label
        # Force open pen config
        page.click("#pen-btn")
        page.wait_for_selector("#pen-config")

        # Find span with i18n key 'tools.pen.size'
        # The text might be populated by i18n.js.
        # Check the text content of the label.
        # <span data-i18n="tools.pen.size">Size</span>
        label_span = page.locator('span[data-i18n="tools.pen.size"]').first
        text = label_span.inner_text()
        print(f"Pen Size Label: {text}")

        # Take screenshot of pen config
        page.screenshot(path="verification/verification.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
