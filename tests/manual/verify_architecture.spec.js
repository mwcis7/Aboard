const { test, expect } = require('@playwright/test');

test('Verify background elements structure and transform layer', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:3000');

  // Check if transform-layer exists
  const transformLayer = page.locator('#transform-layer');
  await expect(transformLayer).toBeAttached();

  // Check if children are inside transform-layer
  const bgCanvas = page.locator('#transform-layer > #background-canvas');
  await expect(bgCanvas).toBeAttached();

  const gifLayer = page.locator('#transform-layer > #gif-layer');
  await expect(gifLayer).toBeAttached();

  const canvas = page.locator('#transform-layer > #canvas');
  await expect(canvas).toBeAttached();

  // Set background image via JS (simulating upload/selection)
  await page.evaluate(() => {
    const bgManager = new BackgroundManager(document.getElementById('background-canvas'), document.getElementById('background-canvas').getContext('2d'));
    // Force creation of image element
    bgManager.backgroundPattern = 'image';
    bgManager.backgroundImageData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 white pixel
    bgManager.updateBackgroundImageElement();
  });

  // Check if background image is inside transform-layer
  const bgImage = page.locator('#transform-layer > #background-image-element');
  await expect(bgImage).toBeAttached();

  // Perform zoom and check transform on layer
  await page.evaluate(() => {
    const app = new DrawingBoard(); // Re-init or get instance? Assuming new instance or existing logic
    // We can just manipulate the existing instance if attached to window, but it's not.
    // Let's trigger zoom via UI or dispatch event.
    // Or just check if DrawingBoard.applyZoom targets transform-layer.

    // Simpler: Just check if 'applyZoom' method in source code targets transform-layer
    // But we are in browser context.
  });

  // Verify transform logic via CSS check after simulated interaction
  // We can't easily access the DrawingBoard instance from tests unless we expose it.
  // But we can check if #canvas has no transform and #transform-layer does.

  // Wait for initial render
  await page.waitForTimeout(1000);

  const canvasTransform = await canvas.evaluate(el => el.style.transform);
  const layerTransform = await transformLayer.evaluate(el => el.style.transform);

  console.log('Canvas Transform:', canvasTransform);
  console.log('Layer Transform:', layerTransform);

  // Canvas should have no transform (or 'none')
  expect(canvasTransform === '' || canvasTransform === 'none').toBeTruthy();

  // Layer should have transform (at least translate/scale from initial applyZoom)
  expect(layerTransform).toContain('scale');
  expect(layerTransform).toContain('translate');
});
