from playwright.sync_api import sync_playwright

def verify_widgets(page):
    # Go to the page
    page.goto("http://localhost:8080/index.html")

    # Wait for loading
    page.wait_for_load_state("networkidle")

    # Handle Announcement Modal if it appears
    try:
        page.wait_for_selector("#announcement-modal.show", timeout=2000)
        print("Announcement modal found, closing...")
        # Click the "No Show Again" or "OK" button
        if page.is_visible("#announcement-no-show-btn"):
             page.click("#announcement-no-show-btn")
        elif page.is_visible("#announcement-ok-btn"):
             page.click("#announcement-ok-btn")

        page.wait_for_selector("#announcement-modal", state="hidden")
        print("Announcement modal closed")
    except Exception:
        print("No announcement modal found or timed out waiting for it")
        pass

    # Click More button to open feature panel
    page.click("#more-btn")

    # Wait for feature panel
    page.wait_for_selector("#feature-area.show")

    # Click Timer button
    page.click("#timer-feature-btn")

    # Wait for Timer modal (settings)
    page.wait_for_selector("#timer-settings-modal.show")

    # Click Start on the timer settings modal
    page.click("#timer-start-btn")

    # Wait for Timer widget
    page.wait_for_selector(".timer-display-widget")

    # Open More menu again
    page.click("#more-btn")

    # Click Scoreboard button
    page.click("#scoreboard-feature-btn")

    # Wait for Scoreboard widget
    page.wait_for_selector(".scoreboard-widget")

    # Open More menu again
    page.click("#more-btn")

    # Click Random Picker button
    page.click("#random-picker-feature-btn")

    # Wait for Random Picker widget
    page.wait_for_selector(".random-picker-widget")

    # Take screenshot
    page.screenshot(path="/home/jules/verification/widgets_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_widgets(page)
            print("Verification successful")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
