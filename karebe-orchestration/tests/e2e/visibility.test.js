const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    console.log('Testing index.html (customer page)...');
    await page.goto('http://localhost:3000/index.html');
    await page.waitForTimeout(2000);

    // Check if admin link is visible
    const adminLink = await page.locator('nav a[href="admin.html"]');
    const adminLinkVisible = await adminLink.isVisible();
    console.log(`Admin link visible on index.html: ${adminLinkVisible}`);

    // Check if rider link is visible
    const riderLink = await page.locator('nav a[href="rider.html"]');
    const riderLinkVisible = await riderLink.isVisible();
    console.log(`Rider link visible on index.html: ${riderLinkVisible}`);

    console.log('\nTesting admin.html (admin dashboard - not logged in)...');
    await page.goto('http://localhost:3000/admin.html');
    await page.waitForTimeout(2000);

    // Check if sidebar is visible
    const sidebar = await page.locator('aside.admin-nav');
    const sidebarVisible = await sidebar.isVisible();
    console.log(`Admin sidebar visible (not logged in): ${sidebarVisible}`);

    // Check if login form is visible
    const loginForm = await page.locator('#adminLogin');
    const loginFormVisible = await loginForm.isVisible();
    console.log(`Admin login form visible: ${loginFormVisible}`);

    // Check if app content is visible
    const appContent = await page.locator('#adminApp');
    const appContentVisible = await appContent.isVisible();
    console.log(`Admin app content visible: ${appContentVisible}`);

    console.log('\nConsole errors collected:');
    if (consoleErrors.length === 0) {
        console.log('No console errors');
    } else {
        consoleErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    await browser.close();

    // Exit with error code if visibility issues found
    if (adminLinkVisible || riderLinkVisible || sidebarVisible) {
        console.log('\n❌ FAIL: Security issue - admin/rider links visible to unauthenticated users');
        process.exit(1);
    } else {
        console.log('\n✅ PASS: Unauthenticated users cannot see admin/rider links');
        process.exit(0);
    }
})();
