# Family Wallet

A monthly budget for couples. Track salary, commitments and savings, and see:

- a pie chart of where the money goes
- a financial health level (Healthy / Okay / Caution / Critical) with advice
- a yearly summary

It works on phones and laptops.

One link for the whole family. **Every family keeps its records in its own Google Sheet**, so nothing mixes.

**App link:** https://khairilnasir.github.io/dompet-keluarga/

---

## For families (no code needed)

1. Go to [sheets.new](https://sheets.new) to create a new, **empty** Google Sheet. Name it, for example, *Family Budget*.
2. Click **Share** (top right), add the admin's email as **Editor**, and click **Send**. The email is shown in the app under **Settings**.
3. In the same Share window, click **Copy link**.
4. Open the app, go to **Settings**, paste the link and click **Connect**.
5. To connect your partner: share the Google Sheet with their Gmail as **Editor**. On their phone, they open the sheet, click **Share → Copy link**, and paste it into the app's **Settings**.

> Keep your sheet link private. Anyone who has it can use the app to see your records.

The app also has a **Guide** tab with the same steps and an FAQ.

---

## For the admin (one time only)

### 1. Set up the Google server (Apps Script)

1. Go to https://script.google.com and click **New project**.
2. Click **Untitled project** at the top and rename it **Family Wallet**.
3. Delete the starter code and paste **all** of `Code.gs`. Click **Save**.
4. In the toolbar, choose the function **authorize** and click **Run**.
5. When the **Authorization required** window appears:
   1. Click **Review permissions** and pick your Google account.
   2. On *"Google hasn't verified this app"*, click **Advanced → Go to Family Wallet (unsafe)**. This warning is normal: it's your own script.
   3. Click **Allow**.

   > If you only see *"This project requires access to your Google Account"* and no window opens, your browser blocked the pop-up. Allow pop-ups for `script.google.com` and click **Run** again.

6. The Execution log should show `Ready. Admin account: your@gmail.com`.
7. Click **Deploy → New deployment**, click the gear icon and choose **Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy** and copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends with `/exec`.

### 2. Put the URL into the app

1. In GitHub, open `index.html` and click the pencil icon (**Edit**).
2. Press Ctrl+F, search for `API_URL`, and paste your URL between the quotes:
   ```js
   const API_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
3. Click **Commit changes** and wait 1–2 minutes.

### 3. Test it

Open the app, go to **Settings**, and connect your own Google Sheet by following the family steps above. A green **Connected** label means you're ready to share the link.

### Admin notes

- **Family sheets are shared with your account**, so you can technically open them. Let families know.
- To list every connected family, run `listFamilySheets` in Apps Script and check the *Execution log*.
- If you edit `Code.gs` later, go to **Deploy → Manage deployments**, click the pencil icon, choose **Version: New version**, and click **Deploy**. The URL stays the same, so `index.html` doesn't need changing.
- For safety, the app only connects to a **new, empty** sheet, or one it has set up before. This stops anyone from using the server to read your other spreadsheets.

---

## How the health level is calculated

| Measure | Guide |
|---|---|
| Debt ratio (DSR) = loan and credit card payments ÷ income | ≤30% healthy, >40% caution, >60% critical |
| Savings rate | target 20%; under 5% is caution |
| 50/30/20 split | needs / wants / savings |
| Balance | a deficit is critical |

This is general guidance, not professional financial advice.
