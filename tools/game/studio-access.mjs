/** Real UI sign-in shared by browser workflows. */
export async function unlockStudio(page) {
  await page.locator("#studio-password, #entity-form").first().waitFor();
  if (await page.locator("#studio-password").count()) {
    await page.locator("#studio-password").fill("1126");
    await page.locator('#studio-access-form button[type="submit"]').click();
  }
  await page.locator("#entity-form").waitFor();
}
