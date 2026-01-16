import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Close announcement
        if page.is_visible("#announcement-modal"):
            page.click("#announcement-ok-btn")

        # Select "Move" tool first
        page.click("#pan-btn")

        # Open Timer Settings
        page.click("#more-btn")
        page.click("#timer-feature-btn")

        # Wait for modal
        page.wait_for_selector("#timer-settings-modal.show")

        # Check active class
        pen_class = page.get_attribute("#pen-btn", "class")

        if "active" not in pen_class:
            print("Success: Timer settings did not switch to Pen tool.")
        else:
            print(f"Failure: Pen is active: {pen_class}")
            exit(1)

        browser.close()

if __name__ == "__main__":
    run()
