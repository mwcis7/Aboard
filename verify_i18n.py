from playwright.sync_api import sync_playwright
import time

def verify_i18n_auto():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Test with a specific locale
        context = browser.new_context(locale='zh-CN', timezone_id='Asia/Shanghai')
        page = context.new_page()
        page.goto('http://localhost:8080')

        page.wait_for_timeout(1000)

        # Click Announcement OK if present
        if page.is_visible('#announcement-ok-btn'):
            page.click('#announcement-ok-btn')
            page.wait_for_timeout(500)

        # Check if title is in Chinese
        title = page.title()
        print(f"Page Title (zh-CN): {title}")
        if "白板" not in title:
            print("FAILED: Title not translated to zh-CN")

        # Check Time Display Settings
        page.click('#settings-btn')
        page.wait_for_timeout(500)
        page.click('.settings-tab-icon[data-tab="more"]')
        page.wait_for_timeout(500)

        # Check if Date Format has "Auto" option selected or available
        date_format_select = page.locator('#date-format-select')
        options = date_format_select.locator('option').all_text_contents()
        print(f"Date Format Options: {options}")

        if not any("自动" in opt or "Auto" in opt for opt in options):
             print("FAILED: 'Auto' option not found in date format select")
        else:
             print("SUCCESS: 'Auto' option found")

        # Screenshot for visual verification
        page.screenshot(path='verification_i18n.png')

        browser.close()

if __name__ == '__main__':
    verify_i18n_auto()
