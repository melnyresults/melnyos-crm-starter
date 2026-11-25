# MelnyOS CRM

MelnyOS is a single-person CRM for keeping track of businesses, calls, email drafts and sales meetings. It runs on your computer and starts with an empty SQLite database. You can get started without a cloud account, API key or database setup.

## Run it for the first time

1. Install Node.js. This version was tested with **Node 22.23.2**, which includes npm and SQLite support. Run `node --version` in a new terminal to check your installation. [Download Node.js](https://nodejs.org/en/download)
2. If you received the ZIP, extract it and open a terminal **inside the `melnyos-crm-starter` folder**, where you see `package.json` and this README. If you have access to the private GitHub repo, use the clone commands below instead.
3. Install the dependencies and start the CRM.

```sh
npm ci
npm run dev
```

Open **[your dashboard](http://127.0.0.1:3000/admin/dashboard)**. Keep the terminal open while you work. Press **Ctrl+C** to stop it. Next time, run `npm run dev` from the same folder. Your records will still be there.

### Clone with Git

With GitHub access, run these commands before step 3. [Install Git](https://git-scm.com/downloads)

```sh
git clone https://github.com/melnyresults/melnyos-crm-starter.git
cd melnyos-crm-starter
```

The ZIP also includes a complete Git repository in a single bundle file. To keep the commit history without a GitHub account, open a terminal beside the bundle and run the following. This creates a new folder named `my-crm`.

```sh
git clone melnyos-crm-starter.bundle my-crm
cd my-crm
npm ci
npm run dev
```

## Try it with one business

- Open **Businesses → Add business**. Enter a name, city and phone number or email address. To bring in a list, use **Import CSV**. Include a `business` column, a `city` column and at least one of `phone` or `email`. Review the import preview before confirming.
- Under **Cold calls**, choose **Review call**. After you log an outcome, reopen the business to see or edit the note under **Previous calls**. Editing a note keeps the original call count.
- Under **Cold email → Email-ready**, choose **Write draft**. Save a subject and message, then reopen the same draft through **Drafts** or **Comms → Inbox**. Batch approval records the exact copy you reviewed for the next day. Delivery is manual through your own mail client.
- Use **Sales calls → Manage stage** to correct an accidental booking. Review the affected stages before confirming. **Undo correction** restores them immediately afterward.

**Today** and **Analytics** track first attempts. The daily targets are 25 first calls on weekdays and 25 first emails every day. Repeat attempts and email drafts earn no first-contact credit. Use **A/B experiments** to compare phone scripts and email variants separately.

## Other tools

**Finances** records CAD income and expenses. **Revenue overview** reads the same ledger. **Form submissions** accepts manual entries. **Blog drafts** and **Events** keep local editorial and event records. You can also keep tasks, client briefs and knowledge notes in the workspace. Connecting a website, calendar, mailbox or bank requires a separate integration.

## Storage and backups

The server saves records in `data/crm.sqlite` in the project folder. Git ignores that directory. Before a backup, wait for **Saved to the local server** in the outreach screen, stop the app with **Ctrl+C**, and copy the entire `data` folder to a safe location. If the screen reports a save conflict, resolve it before backing up. To restore on another computer, stop its CRM, keep a copy of its existing `data` folder, then place your backed-up `data` folder next to `package.json` and start the app.

The default address is loopback, accessible from this computer. This edition assumes one trusted local user. A shared or public installation needs authentication and a different deployment configuration.

## Settings and troubleshooting

- **Reporting time zone.** The default is `America/Toronto`. To change it, create a file named `.env.local` beside `package.json` and add a line such as `NEXT_PUBLIC_CRM_TIME_ZONE=America/Vancouver`. Restart the dev server, or rebuild if using the production start command.
- **Custom data folder.** Set `MELNYOS_DATA_DIR` in `.env.local` to the full path of a folder you own. Stop the app before moving existing data and use that folder for backups.
- **Port 3000 is busy.** Run `npm run dev -- --port 3001` and open [the dashboard on port 3001](http://127.0.0.1:3001/admin/dashboard). Stick to the same address and port during a session so the browser can recover pending edits.
- **SQLite is unavailable.** Check `node --version` in the terminal running the CRM. Install the version listed above, reopen the terminal and run `npm ci` again.

For a production build on the same computer, run `npm run build`, then `npm start`. To verify your checkout, run `npm test`. The test builds the app and checks that a temporary database starts empty, survives a restart and rejects stale edits.
