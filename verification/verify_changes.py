import os
import time
from playwright.sync_api import sync_playwright

def verify_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to page
        page.goto('http://localhost:8000')
        page.wait_for_load_state('networkidle')

        # Close announcement modal if present
        try:
            if page.is_visible('#announcement-modal.show'):
                page.click('#announcement-ok-btn')
                page.wait_for_selector('#announcement-modal.show', state='hidden')
        except Exception as e:
            print(f"Announcement modal handling failed: {e}")

        # Open Settings (Config Area) -> Background
        # Click "Background" tool button
        page.click('#background-btn')

        # 1. Verify "Move Origin" button visibility
        # Select "Coordinate" pattern
        page.click('.pattern-option-btn[data-pattern="coordinate"]')
        # Check for move origin button
        move_origin_btn = page.locator('#move-origin-btn')
        if move_origin_btn.is_visible():
            print("Move Origin button visible")
        else:
            print("Move Origin button NOT visible")

        page.screenshot(path='verification/step1_coordinate.png')

        # 2. Verify "GIF Settings" button visibility
        # Upload GIF
        # We need to simulate file upload
        with page.expect_file_chooser() as fc_info:
            page.click('#image-pattern-btn')
        file_chooser = fc_info.value
        file_chooser.set_files("test.gif")

        # Wait for image to load and buttons to appear
        # The upload handler sets style.display = 'flex' for #image-size-group
        page.wait_for_selector('#image-size-group', state='visible')

        # Check for GIF settings button
        gif_settings_btn = page.locator('#bg-gif-settings-btn')
        if gif_settings_btn.is_visible():
            print("GIF Settings button visible")
        else:
            print("GIF Settings button NOT visible")

        page.screenshot(path='verification/step2_gif_uploaded.png')

        # 3. Verify Modal Open
        if gif_settings_btn.is_visible():
            gif_settings_btn.click()
            page.wait_for_selector('#gif-settings-modal', state='visible')
            page.screenshot(path='verification/step3_gif_modal.png')
            print("GIF Settings modal opened")

            # Close modal
            page.click('#gif-settings-cancel-btn')

        # 4. Verify Image Controls
        # The image controls should be visible after upload
        controls = page.locator('#image-controls-overlay')
        if controls.is_visible():
            print("Image Controls overlay visible")
            page.screenshot(path='verification/step4_image_controls.png')
        else:
            print("Image Controls overlay NOT visible")

        browser.close()

if __name__ == "__main__":
    os.makedirs('verification', exist_ok=True)
    verify_features()
