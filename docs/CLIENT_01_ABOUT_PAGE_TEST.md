# Client 01 About Us page — manual role test

Payload authentication is tied to the CMS hostname. Always use `localhost:3000` for every local CMS session. To keep both roles open at once, use two isolated browser sessions—for example, a normal window plus a private/InPrivate window, or two different browser profiles.

## Open the three views

1. Normal browser session — CMS Super Admin: <http://localhost:3000/admin/login>
2. Private/InPrivate browser session — Client 01 Company Admin: <http://localhost:3000/admin/login>
3. Another tab — Client 01 website: <http://localhost:3101>

Do not replace `localhost` with `127.0.0.1`. The CMS now redirects wrong-host Admin page loads to the canonical address and stops stale wrong-host Server Actions before they reach Payload. If an old `127.0.0.1` editor tab is already open, copy any unsaved values, close that tab, and reopen the page with `localhost` before saving.

## Development accounts

| Profile                 | Email                         | Password                      |
| ----------------------- | ----------------------------- | ----------------------------- |
| Super Admin             | `admin@example.test`          | `replace-this-local-password` |
| Client 01 Company Admin | `client01.owner@example.test` | `client01-local-password`     |

These accounts exist only in the disposable local release-candidate database.
They must be deleted or rotated before any deployment and must never be reused
in production.

## Part 1 — Super Admin creates the page

1. Sign in as Super Admin.
2. Open the left menu and set **Filter by Tenant** to **Client 01**.
3. Open **Content → Pages** and select **Create New**. **Client 01 Website** is selected automatically because this tenant has one website.
4. Enter `About Us` for the title and `about` for the slug.
5. Select **Standard** for the template.
6. Under **Page typography**, keep **Brand default**.
7. Under **Layout**, add a **Hero** block and enter an initial heading and text.
8. Add any other Client 01 blocks you want.
9. Select **Save Draft**, check the information, and then select **Publish changes**.
10. Open <http://localhost:3101/about> and confirm the page is visible.

## Part 2 — Client 01 administrator changes the page

1. In the Client 01 Admin tab, sign in as Client 01 Company Admin.
2. Open **Content → Pages**. Only Client 01 pages should be visible.
3. Open **About Us** and select **Edit**.
4. Change **Page typography → Page font** to **Modern sans** or **Editorial serif**.
5. Change the Hero heading or text.
6. Select **Publish changes**.
7. Refresh <http://localhost:3101/about> and confirm that both the text and font changed.

## Expected security checks

- Client 01 Company Admin cannot see or edit DGTL360 pages.
- Client 01 Company Admin cannot assign the page to another website.
- Super Admin can see the page across the platform.
- Only the three approved font treatments are available; arbitrary CSS is not accepted.
