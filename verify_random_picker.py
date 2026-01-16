from playwright.sync_api import sync_playwright
import time

def verify_random_picker():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8080')

        # Wait for load
        page.wait_for_timeout(1000)

        # Click Announcement OK
        if page.is_visible('#announcement-ok-btn'):
            page.click('#announcement-ok-btn')
            page.wait_for_timeout(500)

        # Click "More"
        page.click('#more-btn')
        page.wait_for_timeout(500)

        # Click "Random Picker"
        page.click('#random-picker-feature-btn')
        page.wait_for_timeout(500)

        # Click Settings on the widget (it's the gear icon)
        # The widget ID is dynamic random-picker-1 usually
        page.click('.random-picker-settings-btn')
        page.wait_for_timeout(500)

        # Take screenshot of the modal
        page.screenshot(path='verification_random_picker.png')

        browser.close()

if __name__ == '__main__':
    verify_random_picker()
