from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:3000')

        # Wait for page load
        page.wait_for_timeout(1000)

        # Close announcement modal if it appears
        if page.locator('#announcement-modal.show').count() > 0:
            page.click('#announcement-ok-btn')
            page.wait_for_timeout(500)

        # 1. Enable Pan tool
        page.click('#pan-btn')

        # Take initial screenshot
        page.screenshot(path='/home/jules/verification/initial_state.png')

        # Pan the canvas
        # Drag from center to right-down
        page.mouse.move(400, 300)
        page.mouse.down()
        page.mouse.move(600, 500)
        page.mouse.up()

        page.wait_for_timeout(500)

        # Take screenshot after pan
        page.screenshot(path='/home/jules/verification/after_pan.png')

        # Verify Transform Layer has moved
        transform = page.locator('#transform-layer').evaluate("el => el.style.transform")
        print(f"Transform after pan: {transform}")

        page.screenshot(path='/home/jules/verification/final_verification.png')

        browser.close()

if __name__ == '__main__':
    verify_frontend()
