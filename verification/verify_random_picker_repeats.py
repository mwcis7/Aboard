import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Close announcement modal if present
        if page.is_visible("#announcement-modal"):
            page.click("#announcement-ok-btn")

        # Open "More" menu
        page.click("#more-btn")

        # Open Random Picker
        page.click("#random-picker-feature-btn")

        # Wait for widget
        page.wait_for_selector(".random-picker-widget")

        # Open Settings
        page.click(".random-picker-settings-btn")

        # Wait for modal
        page.wait_for_selector("#random-picker-settings-modal.show")

        # Check if checkbox exists and is visible in Name Mode (default)
        checkbox = page.locator("#rp-allow-repeats")
        if not checkbox.is_visible():
            print("Error: Allow Repeats checkbox not visible in Name Mode")
            exit(1)

        # Switch to Number Mode
        page.click("button[data-mode='number']")

        # Check if checkbox exists and is visible in Number Mode
        if not checkbox.is_visible():
            print("Error: Allow Repeats checkbox not visible in Number Mode")
            exit(1)

        print("Success: Allow Repeats checkbox is visible in both modes.")

        # Take screenshot
        page.screenshot(path="verification/random_picker_settings.png")

        browser.close()

if __name__ == "__main__":
    run()
