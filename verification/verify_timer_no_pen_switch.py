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

        # Select "Move" tool first to ensure we aren't in Pen mode
        page.click("#pan-btn")

        # Verify active tool is Move
        assert "active" in page.get_attribute("#pan-btn", "class")
        assert "active" not in page.get_attribute("#pen-btn", "class")

        # Open Timer Settings
        page.click("#more-btn")
        page.click("#timer-feature-btn")

        # Wait for modal
        page.wait_for_selector("#timer-settings-modal.show")

        # Verify active tool is STILL Move (Pen should NOT be active)
        assert "active" in page.get_attribute("#pan-btn", "class")
        assert "active" not in page.get_attribute("#pen-btn", "class")

        print("Success: Timer settings did not switch to Pen tool.")
        browser.close()

if __name__ == "__main__":
    run()
