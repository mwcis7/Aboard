from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8080")

        # Wait for the page to load
        page.wait_for_selector("#toolbar")

        # Handle announcement modal if it appears
        try:
            page.wait_for_selector("#announcement-modal.show", timeout=2000)
            print("Announcement modal found, clicking OK...")
            page.click("#announcement-ok-btn")
            page.wait_for_selector("#announcement-modal.show", state="hidden")
        except:
            print("Announcement modal not found or already hidden")

        # Click the "More" button to show the feature area
        print("Clicking More button...")
        page.click("#more-btn")

        # Wait for feature area to be visible
        print("Waiting for feature area...")
        page.wait_for_selector("#feature-area.show")

        # Click the "Timer" button to show timer settings modal
        print("Clicking Timer button...")
        page.click("#timer-feature-btn")

        # Wait for the timer settings modal to appear
        print("Waiting for Timer settings modal...")
        page.wait_for_selector("#timer-settings-modal.show")

        # Take a screenshot of the timer settings modal
        # We focus on the modal to see the buttons clearly
        modal = page.locator("#timer-settings-modal .timer-modal-content")
        modal.screenshot(path="verification/timer_settings_modal.png")

        # Also verify the text of the buttons
        stopwatch_btn = page.locator('.timer-mode-btn[data-mode="stopwatch"]')
        countdown_btn = page.locator('.timer-mode-btn[data-mode="countdown"]')

        print("Stopwatch button text:", stopwatch_btn.text_content().strip())
        print("Countdown button text:", countdown_btn.text_content().strip())

        browser.close()

if __name__ == "__main__":
    run()
