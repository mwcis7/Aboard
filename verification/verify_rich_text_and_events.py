import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Close announcement modal
        if page.is_visible("#announcement-modal"):
            page.click("#announcement-ok-btn")

        # 1. Verify Rich Text
        # Open Settings (Pen)
        page.click("#pen-btn")
        page.click("#pen-config .help-btn")

        # Wait for modal
        page.wait_for_selector("#help-modal.show")

        page.click("#help-modal .modal-close-btn")

        # 2. Verify Event Propagation
        # Open Random Picker
        page.click("#more-btn")
        page.click("#random-picker-feature-btn")

        # Wait for widget
        widget = page.wait_for_selector(".random-picker-widget")

        # Simulate dragging the widget
        box = widget.bounding_box()
        page.mouse.move(box['x'] + 10, box['y'] + 10)
        page.mouse.down()
        page.mouse.move(box['x'] + 100, box['y'] + 100)
        page.mouse.up()

        print("Rich Text Help and Event Propagation verification script ran successfully.")

        page.screenshot(path="verification/rich_text_events.png")

        browser.close()

if __name__ == "__main__":
    run()
