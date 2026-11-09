# User Guide

The web app and the Android app work the same way. On a phone, use the **bottom bar** to move
around; **More** opens the remaining pages. On a computer, use the **sidebar**. The ☀/☾ button
switches between light and dark mode.

---

## For admins

### First login

1. Sign in with username `admin` and the temporary password `ChangeMe!2024`, or whatever
   password you set in `schema.sql`.
2. Choose a new password. You can't continue until you do.
3. Optional: under **Profile**, set your name and photo.

### Add lab members

Open **Admin → Users → Create user**:

1. Enter the person's **full name**. A username is suggested from it, for example
   `ada.lovelace`, and you can edit it.
2. Leave the generated **temporary password** or type your own. It needs at least 8 characters
   with letters and numbers.
3. Pick a role. **Member** is the usual choice; **Admin** gives full control.
4. Click **Create account**. The app shows the credentials once. Click **Copy** and send them to
   the person privately.

On first login, the member must replace the temporary password.

### Manage accounts

Use the **⋮** menu next to a user:

| Action | Effect |
|---|---|
| Edit details | Change the name or research area. |
| Reset password | Generates a new temporary password, shown once. The user must change it at next login. |
| Make admin / Make member | Changes the role. You can't demote yourself, and you can't remove the last admin. |
| Deactivate / Reactivate | Blocks or restores sign-in. Their papers stay visible. |
| Delete user | Permanently removes the account, papers, submissions and files. Prefer **Deactivate** if you might need the data. |

### Forgot-password requests

When a member taps **Forgot password?** on the login page, their request appears in two
places:

- under the **🔔 bell** in the top bar, where it's included in the badge count
- at the top of **Admin → Users**

To resolve a request, click **Reset password** next to it. The app shows a new temporary
password; send it to the member privately. The request then closes automatically. Use
**Dismiss** for requests you don't want to act on.

### Content and settings

- **Admin → Papers:** search every paper in the lab and delete inappropriate or duplicate
  entries.
- **Admin → Topics:** create, rename, recolour or delete topics. Deleting a topic only untags
  papers; the papers themselves stay.
- **Admin → Venues:** add, edit or delete conferences and journals.
- **Admin → Overview:** lab statistics, plus a toggle for **"Members can add conferences &
  journals"**.

---

## For members

### Getting started

1. Sign in with the **username** and **temporary password** your admin sent you.
2. Choose your own password.
3. Open **Profile** (on mobile it's under **More**). Add a photo, your research area and a
   short bio.

### Log a paper

1. Open **My Papers → Add paper**.
2. Fill in what you know. Only the **title** is required.
   - **Details:** authors, year, venue, DOI or URL, and an optional PDF (up to 50 MB).
   - **Classification:** paper type, research topics, and status (To read, Reading or
     Completed).
     - To add a topic, start typing to search. Press **Enter** to create a topic that doesn't
       exist yet.
   - **Reading:** date read, how you read it (full read, skim, abstract only or group
     discussion), time spent, and a ★ rating.
   - **Notes:** summary, key contributions, methodology, results, limitations and your own
     notes.
3. Click **Add paper**. To change it later, open the paper and use **Edit** or **Delete**. Only
   you can edit your own entries.

**Tip:** set the status to **Completed** and fill in **Date read** so the paper counts towards
your stats and streak.

### Your dashboard

The dashboard shows:

- papers read
- total papers logged
- topics covered
- your **reading streak**: the number of consecutive days with a paper read
- hours spent reading
- a papers-per-month chart and a topics chart
- your upcoming deadlines and submission plans

### Explore the lab

| Page | What it shows |
|---|---|
| **Explore** | Search every paper in the lab, filtered by member, topic, type, year or status |
| **Members** | Everyone's paper counts, current topics and latest activity. Tap a member to see their profile and papers (read-only). |
| **Topics** | How many papers each topic has and who is reading it |
| **Activity** | The latest papers and submission plans across the lab |
| **Lab Stats** | Lab-wide counters and charts |

### Track your progress (preparations)

Use **Progress** to share what you're working towards. Examples:

- mastering a topic
- writing a paper
- an experiment
- an exam or course
- a new skill

On a phone, **Progress** is in the bottom bar. On a computer, it's in the sidebar.

1. Tap **New preparation**. Fill in a title and category, and optionally a research topic, a
   target date, a starting percentage and a description.
2. As you work, open it and tap **Post update**. Drag the slider to your new percentage (or
   tap 10/25/50/75/100%) and write what you did.
3. At **100%** it's marked **Completed** automatically.

**Everyone in the lab** can see your preparations and their timelines:

- on the **Progress** board, filterable by member, topic and status
- on your **profile**
- on each **topic** under "Who's working on it"
- in the **Activity** feed

Your dashboard shows your own preparations and the latest updates from the lab. Only you can
edit your preparations; admins can delete them if needed.

### Deadlines and submissions

- **Deadlines** lists conferences and journals by their nearest deadline, with a **live
  countdown**:
  - 🟢 more than 30 days
  - 🟡 7–30 days
  - 🔴 less than 7 days
  - ⚪ passed
- Switch between **List** and **Calendar** views. You can filter by upcoming or past, by
  conference or journal, and by field.
- The **🔔 bell** in the top bar shows how many deadlines fall within the next 7 days.
- To tell the lab you're submitting, open a venue and tap **I'm planning to submit**. Enter your
  paper's title and status (Planning, Writing, Submitted, Accepted or Rejected). Update the
  status as you go.
- If your admin allows it, you can add new venues too. You can edit only the venues you added.

### Change your password

Open **Profile → Change password**. Enter your current password, then the new one twice.

**Forgot your password?** On the login page, tap **Forgot password?** next to the Password
field, enter your username and tap **Send request**. Your admin is notified and will give you a
new temporary password. Sign in with it, then choose your own password.

### Install the app

- **Android:** install the APK your admin shares.
- **Any phone or computer:** open the website. In the browser menu, choose **Install app** or
  **Add to Home screen**.
