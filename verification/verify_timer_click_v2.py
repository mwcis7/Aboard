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

        # Open Timer Settings
        page.click("#more-btn")
        page.click("#timer-feature-btn")

        # Wait for modal
        page.wait_for_selector("#timer-settings-modal.show")

        # Click option with stopPropagation
        page.click(".timer-mode-btn[data-mode='countdown']")

        # Click Close button
        page.click("#timer-settings-close-btn")

        # Check if modal closes
        page.wait_for_function("!document.getElementById('timer-settings-modal').classList.contains('show')")

        print("Timer settings interaction successful with stopPropagation.")
        browser.close()

if __name__ == "__main__":
    run()
