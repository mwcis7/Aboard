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

        # Test Background GIF settings UI
        print("Clicking Background button...")
        page.click("#background-btn")

        # Wait for the background config panel to be active
        # Note: The class used is 'active', not 'show' for the panel itself
        page.wait_for_selector("#background-config.active")

        # Check initial state (hidden) of GIF settings
        expect(page.locator("#gif-settings-group")).to_be_hidden()

        # Verify Floating GIF layer
        gif_layer = page.locator("#gif-layer")
        expect(gif_layer).to_be_attached()

        # Verify GifManager is exposed
        is_gif_manager_present = page.evaluate("typeof window.GifManager !== 'undefined'")
        print(f"GifManager present: {is_gif_manager_present}")
        assert is_gif_manager_present

        # Take screenshot
        page.screenshot(path="verification/final_verification.png")

        browser.close()

if __name__ == "__main__":
    run()
