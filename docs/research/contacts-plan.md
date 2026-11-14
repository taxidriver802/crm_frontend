# Contacts: plan

Date: 2026-11-14. Branch: `experiment/CC_design_rnd`. Status: a plan for the owner to review. No code, migration, token or style has been changed. Standard: [crm-ux-checklist.md](crm-ux-checklist.md). Background: [crm-ux-expectations.md](crm-ux-expectations.md), [crm-ux-audit.md](crm-ux-audit.md).

Owner decisions this plan builds on: keep "Leads" in the nav; Leads is the sales board (New → Sold, with a Lost exit); Jobs gets a board that starts at Sold with a collapsed Pre-sale column; one portal link per job.

## 1. Summary

- **Add a Contact record** for the person or household you deal with. A **Lead** becomes one inquiry from a contact, and a **Job** stays the work at one address. Over the years a contact can have many leads and many jobs. This matches the research: competitors keep Contact and Job apart.
- **No Property record.** A contact has a home address, and each job keeps its own site address, filled in from the contact. The contact page lists the different job addresses, which covers landlords with several houses.
- **Spouses share one household contact** ("Helen & Mark Brooks"), each with their own phone and email. Adjusters, property managers and tenants get contacts of their own and are linked to a job with a role.
- **The migration keeps every id and link.** Leads, jobs, tasks, notes, files, portal tokens, pins and saved views stay as they are. A new `contacts` table gets one contact per existing lead, and then `leads.contact_id` and `jobs.contact_id` are filled in. Nothing is merged automatically: an admin reviews possible duplicates.
- **Nav:** Today, Jobs, Leads, **Contacts**, Tasks, Invoices, Inbox.
- **Search** finds contacts by name, by any phone number (the digits only), by email, and by home or job address. Creating a lead, contact or job **warns but does not block** when the phone, email or normalised address matches an existing contact, and offers "Open existing".
- **The portal stays one link per job.** The contact page lists each job's link.
- There are 10 open questions in section 9 and a rough order of work in section 10.

## 2. How it works today

### 2.1 Data

From `crm_backend/sql/schema.sql` and migrations 0001–0003:

| Table | Holds | Links |
|---|---|---|
| `leads` | first and last name, email, phone, source, status (free text; the UI uses New, Contacted, Qualified, Closed, Inactive), budget, service type, preferred contact method, urgency, notes, owner (`assigned_to`). **No address.** | none |
| `jobs` | title, status (New … Proposal Sent → Sold … Work Complete → Closed, or Lost; see `src/lib/jobLifecycle.ts`), **address** (one free-text line), owner | `lead_id` → leads. The column allows nulls, but `createJob` requires it and refuses to change it later. Deleting the lead sets it to null |
| `estimates`, `invoices`, `invoice_payments`, `job_activity`, `job_measurements`, `portal_tokens` | the money, history and portal for one job | `job_id` (deleted with the job) |
| `tasks` | tasks and appointments | exactly one of `lead_id` or `job_id` (a check constraint) |
| `notes` | calls, texts, emails, notes | `entity_type` 'lead' or 'job' plus `entity_id` (no foreign key) |
| `files` | photos and documents | `lead_id`, `job_id`, `task_id` |
| `lead_status_events`, `assignment_events`, `notifications`, `saved_views`, `supplier_orders` | history, alerts, views, supplier orders | point to leads by id or by entity type 'lead' |

### 2.2 Where "the customer" comes from

- **Job page** (`crm_frontend/src/app/jobs/[id]/page.js`): the header reads "Client ‹lead name›". The rail's "Client" panel shows an "Open lead" link with the phone and email, and the "Site" panel shows the job address.
- **Lead page** (`src/app/leads/[id]/page.js`): this already works as a customer page. Its "Work with us" rail panel totals the lead's jobs (contract value, owed).
- **Estimates and invoices** take the client's name, and the invoice email, from the lead (`estimates.service.ts`, `invoices.service.ts`).
- **Homeowner portal** shows the lead's name, email and phone (`portal.service.ts`).
- **Web intake form** creates a lead from name, email, phone, service, preferred contact and a message. It has no address field (`intake.service.ts`).
- **Job form** picks the client from a `<select>` of leads, loaded 200 at most (`/leads?limit=200`), so a company with more leads can't pick its older ones. The address is free text. The app has no address autocomplete or geocoding, only a Google Maps link.
- **Global search** matches leads on first name, last name, email or phone, and jobs on title, description or address, all as ILIKE substrings. The audit found that phone search returns nothing. "6125550147" can never match a stored "(612) 555-0147", and a full name such as "Helen Brooks" matches neither the first-name nor the last-name column.
- **Portal token:** one per job, stored as a hash and valid for 30 days. Each "Copy portal link" issues a new token, so the link the homeowner already has stops working.
- **Who sees what** (`src/lib/tenant.ts`): agents see the leads and jobs assigned to them, plus unassigned ones they created. Owners and admins see everything in the company.

### 2.3 Data on hand

`crm_qa`, company Rooftop Realty: 10 leads and 9 jobs. Helen Brooks has one lead and two jobs at the same address, which makes her a repeat customer. Two leads have no job. No two leads share a phone or an email. Across all companies in `crm_qa` there are 13 leads and 12 jobs. Every job has a lead and an address; 6 leads have no phone and 7 have no email. `crm_dev` (only read, not changed) has 3 leads and 2 jobs. The migration is small today, but it has to work for any company on the hosted app.

### 2.4 What "the lead is the customer" gets wrong

1. A repeat customer either reopens an old lead, which muddles its Closed status and history, or is entered as a second lead, which duplicates the person.
2. The lead's stage describes the person, so someone with a finished roof and a new gutter inquiry can't be both Closed and New.
3. There is nowhere to put a spouse's phone or an insurance adjuster.
4. The person has no address, so searching an address finds only jobs.
5. Deleting a lead takes the client off its jobs.

## 3. Object model

### 3.1 The four things

| | What it is | Stored in | Example |
|---|---|---|---|
| **Contact** | The person or household you deal with, or a partner such as an adjuster or property manager | new `contacts` table | "Helen & Mark Brooks", 7 Juniper Ct |
| **Lead** | One inquiry from a contact: the sales opportunity on the Leads board (New → Sold, Lost exit) | `leads` (kept) | "Gutter replacement · Website · Oct 2026" |
| **Job** | The work at one address: estimates, invoices, schedule, portal | `jobs` (kept) | "Roof replacement · 7 Juniper Ct" |
| **Address** | Text on the contact (home, plus mailing if different) and on the job (site). Not a record of its own | columns | "7 Juniper Ct, Plymouth, MN 55447" |

```
             ┌──────────────── contacts ────────────────┐
             │ Helen & Mark Brooks · homeowner          │
             │ home: 7 Juniper Ct · 2 phones · 2 emails │
             └─────┬──────────────────────────┬─────────┘
       contact_id  │                          │ contact_id (the client: bill-to, portal)
             ┌─────▼──────┐  lead_id  ┌───────▼───────────┐     job_contacts (role)
             │ leads      │──────────▶│ jobs              │◀──── Dan Ortiz, State Farm · adjuster
             │ (inquiry)  │ came from │ (site address)    │
             └────────────┘           └───────┬───────────┘
                                              │ job_id
                       estimates · invoices · payments · activity · portal token
```

- A contact has many leads, and a contact has many jobs. `jobs.contact_id` names the client: who is billed and who gets the portal link.
- A lead can lead to several jobs. `jobs.lead_id` stays and means "came from this inquiry".
- Extra people on a job, such as an adjuster or a tenant, go in a `job_contacts` table with a role.

### 3.2 What a lead becomes

| Option | How | For | Against |
|---|---|---|---|
| A. Contacts is a view of leads | `/contacts` lists leads that have jobs; no new table | No migration; a few days of work | All five problems in 2.4 remain; no spouse or adjuster |
| **B. A contact table, with each lead an inquiry on a contact (recommended)** | New `contacts`; `leads.contact_id`; `jobs.contact_id` | Matches the research's Contact ≠ Job split and the owner's Leads board, where stages and Lost describe an inquiry. Repeat work is a new lead on the same contact. No id changes | One migration, and about ten backend places that read the client's name switch to the contact |
| C. Turn the leads table into contacts, with a stage on each person (HubSpot style) | Rename leads to contacts and add a stage | Ids stay identical | A person has one stage at a time, so they can't be a past customer and a new inquiry at once. A Lost lead would mark the person lost. Every lead URL changes meaning |

**Recommendation: B.**

### 3.3 Which fields move

| Field | Contact | Lead |
|---|---|---|
| Name: first, last, and a display name ("Helen & Mark Brooks") | ✓ | kept as typed, read-only ("as submitted") |
| Primary phone and email | ✓ | kept as typed, read-only |
| More phones and emails, each with a label and a person's name ("Mark · mobile") | ✓ (`contact_methods`) | |
| Preferred contact method | ✓ (moves) | |
| Home address, plus mailing address if different | ✓ | |
| Kind (Homeowner, Adjuster, Property manager, Tenant, Other) and company name (such as the carrier) | ✓ | |
| Rep | ✓ who owns the relationship | ✓ who is working this inquiry |
| Source | first touch, copied from the first lead | ✓ for each inquiry |
| Status, service type, urgency, budget, notes | | ✓ |
| Tags | ✓ (later) | |

The lead's own name, phone and email columns stay as an "as submitted" record of what came in. Nothing is dropped, and any code still reading them keeps working during the switch. Screens show the contact's values.

### 3.4 Households and second contacts

**Spouses and co-owners:**

| Option | How | For | Against |
|---|---|---|---|
| **H1. One household contact (recommended)** | One contact per household. Display name "Helen & Mark Brooks". Extra phones and emails carry the person's name | One search result per house. The address duplicate warning doesn't fire when the spouse is added. Estimates and the portal address the household, the way a roofer thinks of "the Brooks job" | A couple who separate, or sell separately, needs the contact split by hand (rare) |
| H2. One contact per person, grouped as a household | Each person is a contact, joined by a household id | Clean data for each person | Two search results per house. The address warning fires for every spouse. More screens |

**Partners** (adjuster, property manager, tenant, realtor) get contacts of their own, with the kind set, and are linked to jobs through `job_contacts` (job, contact, role). One adjuster record is reused across many jobs, and the adjuster's page lists those jobs. The checklist's insurance field group (carrier, claim #, adjuster, deductible) gets an "Adjuster" field that picks from these contacts. Free text is fine until the partner work ships.

**A rental:** the landlord is the job's contact, because the landlord pays. The tenant goes on the job as "Tenant · site access".

### 3.5 One contact with several jobs or addresses

- **Repeat work on the same house:** a new lead (or job) on the same contact, with the site address filled in from the contact.
- **A landlord with several houses:** one contact. Each job has its own site address. The contact page shows "Properties", the distinct job addresses (worked out from the jobs, not stored), each with its jobs.
- **Moved house:** change the contact's home address. Old jobs keep their site address.
- **No Property table.** None of the vendors studied has one (expectations doc, row "Contact ≠ Job"), and the worked-out list covers the needs above. Revisit only if the company starts selling maintenance plans for each roof.

### 3.6 Tables (columns, not code)

| Table | Columns |
|---|---|
| `contacts` (new) | id, company_id, user_id (who created it), assigned_to (rep), kind, first_name, last_name, display_name (blank = "first last"), company_name, phone, phone_key\*, email, email_key\*, address, address_key\*, mailing_address, preferred_contact_method, source, merged_into_id, archived_at, legacy_lead_id (unique; the lead it was copied from), created_at, updated_at |
| `contact_methods` (new) | id, company_id, contact_id, kind (phone or email), value, value_key\*, label (mobile, home, work), person_name, created_at |
| `job_contacts` (new) | company_id, job_id, contact_id, role (co-owner, adjuster, property manager, tenant, other), note, created_at |
| `leads` | add contact_id |
| `jobs` | add contact_id, address_key\* |
| `notes`, `tasks`, `saved_views` | allow 'contact' (notes and tasks only if question 7 is yes) |

\* Worked out by the database from the column next to it (section 7.1), so the app, the backfill and search always agree.

## 4. Migration that keeps ids and links working

### 4.1 Steps

The migration adds the new tables and columns first, switches the app over, and only then tightens the rules. Old code keeps running between steps.

1. **Migration `0004_contacts.sql`.** Forward-only and safe to run twice, as the migrations README asks.
   - Add the key functions, the three new tables, `contact_id` on leads and jobs (empty allowed for now, and a contact with leads or jobs can't be deleted), and `jobs.address_key`. Add indexes on (company, phone_key), (company, email_key), (company, address_key) and (company, last name, first name).
   - Copy one contact from each lead. `legacy_lead_id` makes a re-run skip leads already copied. The name, phone, email, preferred contact method, source, rep, creator and created date come from the lead. The home address is the lead's newest job address; leads have no address of their own.
   - Set `leads.contact_id`, then set `jobs.contact_id` from each job's lead.
   - A job whose lead was deleted (none in `crm_qa`) gets a placeholder contact, "Client of job #N", which is listed for review.
2. **Release the code that uses contacts.**
   - Every create sets `contact_id`.
   - API shapes stay the same: a lead still returns `first_name`, `phone` and the rest, now read from its contact, and a job keeps its `lead` object and gains a `contact` object.
   - `POST /leads` still accepts the old name and phone fields (it creates the contact) or a `contact_id`. `POST /jobs` accepts `contact_id`, or takes the contact from `lead_id` as before.
3. **Migration `0005_contacts_required.sql`.** If any lead or job still has no contact, it stops and names the records, the way 0002 does for duplicate invoices. Otherwise it makes `contact_id` required.
4. **Later:** the lead's "as submitted" columns stay. Nothing is dropped.

### 4.2 What keeps working

| Thing | After the change |
|---|---|
| `/leads/:id` and lead ids | Unchanged. The page becomes the inquiry page, with a link to its contact |
| `/jobs/:id` and `jobs.lead_id` | Unchanged. Jobs gain `contact_id` |
| Tasks, notes, files, status and assignment history, notifications, supplier orders | Unchanged; still attached to a lead or a job |
| Pins, saved views, search recents of kind "lead" | Unchanged. A new kind, "contact", is added |
| Portal, public estimate, public invoice and intake links | Unchanged; their tokens hang off a job, estimate, invoice or company, not a lead |
| `GET /leads/:id` fields | Same names, with the person's fields read from the contact |
| Deleting a lead | Its jobs keep their client (`contact_id`) |
| New: `/contacts` and `/contacts/:id` | A merged contact's URL sends you to the contact it was merged into |

Contact ids are new numbers, not copies of lead ids. Copying would invite people to swap `/leads/5` for `/contacts/5`, and that breaks after the first merge or the first new contact.

### 4.3 Backend places that read the client today

Found by searching `crm_backend/src` for `leads` and `lead_id`. These switch to the contact in step 2:

- `jobs.service.ts`: the job's `lead` name in every job query.
- `estimates.service.ts`: the client name on estimates and public estimate pages.
- `invoices.service.ts`: the client name and email.
- `portal.service.ts`: the name, email and phone the homeowner sees.
- `dashboard.service.ts`: task titles on Today.
- `search.service.ts`: see section 6.
- `intake.service.ts`: creates a contact plus a lead.
- `quickbooks.routes.ts`: the QuickBooks customer name, which is the invoice job's lead name today.

Lead counts in `reports.service.ts` and `dashboard.service.ts` stay on leads.

### 4.4 Duplicates already in the data

Nothing is merged automatically. A "Possible duplicates" list (owner and admin) groups contacts that share a phone, email or address key, with a Merge button (section 7.4). `crm_qa` has no phone or email groups and one address group: two QA test leads at "3 Test Way".

## 5. Nav and pages

### 5.1 Nav

| Option | Order | For | Against |
|---|---|---|---|
| **N1 (recommended)** | Today, Jobs, Leads, **Contacts**, Tasks, Invoices, Inbox | Leads stays where people look for it, and the two people-lists sit together | The checklist puts Contacts straight after Jobs. Its order predates the owner keeping Leads |
| N2 | Today, Jobs, **Contacts**, Leads, Tasks, … | Matches the checklist position | Moves Leads down a place, against agents' habit |
| N3 | Contacts as a tab inside Leads | No new nav item | Past customers and adjusters aren't leads, and the tab is easy to miss |

Details:

- **Icon:** "users" already marks Leads and Team, so add an outline contact-card icon.
- **Shortcut:** `g c` (free).
- **Saved nav orders:** `resolveNav` (`src/lib/preferences.js`) puts nav items it doesn't know at the end of a user's saved order. Anyone who has rearranged their nav would find Contacts after Inbox. Insert it after Leads instead.
- **Phone bottom bar:** stays Today, Jobs, +, Leads, Tasks. Contacts goes in the menu sheet, and search finds contacts on a phone.
- **"+ Create" menu:** add "Contact" (hint C) after Lead, as the checklist's "+ New" line lists.

### 5.2 List: `/contacts`

The list follows the checklist's table lines and is built on `RecordTable` with the audit's table fixes (numbered pagination, a row menu, no click handler on the whole row). Those fixes land first or together with this page.

**Default columns (6):**

| Column | Shows |
|---|---|
| Name | Display name as a link; a kind tag for partners ("Adjuster") |
| Address | Home address, first line |
| Phone | Primary phone, as a `tel:` link |
| Status | Worked-out chip (below) |
| Rep | Initials avatar |
| Last activity | Relative date |

Columns users can add: Email, Jobs, Lifetime value, Owed, Source, Created, Tags.

**Deviation to approve:** the checklist's sixth default column is value. This list shows Phone instead, because the office uses the contact list to call people and the money already shows on Jobs (question 3).

**Status chip.** Worked out from the contact's leads and jobs, not stored. The first rule that applies wins:

| Chip | Rule | Colour (checklist status line) |
|---|---|---|
| Customer | A job between Sold and Work Complete | green |
| Lead | An open lead and no active job | blue (`--info`) |
| Past customer | Won jobs, all closed, nothing open | gray |
| Lost | Only lost or inactive leads, or lost jobs | gray |
| (none) | A partner with no leads or jobs of their own; shows the kind tag only | none |

Which lead statuses count as open is defined once, next to the Leads board stages, so the chip follows any change the board makes.

**Views and actions:**

- **System views (tabs):** All, Customers, Open leads, Past customers, Partners.
- **Filters:** rep, kind, city or ZIP, tag. They apply without saving a view.
- **Mine / Team toggle,** as on Leads, if question 2 keeps contacts scoped.
- **Default sort:** last activity, newest first.
- **Bulk bar** ("N selected"): assign rep, add tag, export CSV. With exactly two rows selected, owners and admins also get Merge.
- **Empty state:** "No contacts yet." plus a New contact button.

### 5.3 Record: `/contacts/[id]`

The page follows the checklist's Record lines: header, then a main column, then the key-fields rail on the right (the existing `.record-rail`), capped at `max-w-6xl`. On a phone the rail stacks under a sticky header.

**Header**

- Display name, with a kind tag for partners.
- Home address; tapping it opens maps.
- Primary phone, with Call (`tel:`), Text (`sms:`) and Email buttons. On a coarse pointer these are 44 px tap targets in the sticky header.
- Status chip and rep avatar.
- At most two primary buttons: **New lead** and **Log call**. The overflow menu holds New job, New task, Schedule visit, Add phone or person, Link to a job as…, Merge into…, and Archive.

**Main column (the first view, not behind a tab)**

1. **Up next:** open tasks and appointments from all of the contact's leads and jobs, with overdue items in red.
2. **History,** newest first, with a composer on top (log a call, text, email or note). Type filters: All, Calls & messages, Notes, Status changes, Estimates & invoices, Files, Jobs. Each entry says which lead or job it belongs to ("Roof replacement · 7 Juniper Ct"). The feed loads 50 entries at a time.

The only tabs are the ones the checklist allows: **Estimates & invoices** (across all jobs) and **Photos & files**.

**Rail, top to bottom**

1. **Contact details:** phones and emails with labels and names, preferred method, home address, mailing address. These are edited with Save and Cancel, because the checklist's editing line says address, and anything used to reach a homeowner, needs an explicit save.
2. **Jobs & leads:** each with its status chip, site address and value, plus lifetime value and owed. This moves the lead page's "Work with us" panel here. More than five rows shows "View all", which opens the Jobs list filtered to this contact.
3. **Properties:** the distinct site addresses, shown only when there is more than one.
4. **People:** household names, and linked partners with their role ("Adjuster · Dan Ortiz, State Farm · on Roof replacement").
5. **Customer portal:** one row per job: "Shared · expires Dec 12" or "Not shared", with Copy link for owners and admins, as on the job page today (section 8).
6. **Details:** rep and tags (inline edit with "Saved" and Undo), source (first touch), customer since (first Sold date), created.

**Partner contacts** use the same page. Their "Jobs & leads" panel lists the jobs they are linked to, with their role, and their history shows their own notes plus those jobs' status changes.

### 5.4 Changes to the lead and job pages

- **Lead page.**
  - The header name links to the contact.
  - The rail's "Contact" panel shows the contact with "Open contact".
  - "Work with us" moves to the contact page. The lead keeps "Jobs from this lead".
  - Editing a lead's name, phone or email edits the contact, with the line "This changes the contact used on N jobs".
- **Job page.**
  - The header shows the contact's name and the **site address**, which also fixes audit line 14.
  - The rail's "Client · Open lead" becomes "Contact · Open contact", with "From lead #12 · Website" under the job's details.
  - A "People on this job" panel lists `job_contacts`.
  - Owners and admins can change a job's contact with an explicit Save. The change goes in the job's activity; today the client can't be changed at all.
- **Job form:** the "Lead" `<select>` becomes a contact search box (name, phone or address) with "+ New contact". The site address fills in from the contact and can be changed. An optional "From lead" lists the contact's open leads.
- **Estimates, invoices and their public pages:** the client name is the job contact's display name, and the email is the contact's.
- **Peek panel:** add the kind "contact".

## 6. Search

- Global search gets a **Contacts** group, listed first. A contact matches on:
  - its display name, or first and last name together;
  - **any phone, by digits:** a query with 4 or more digits is compared with the phone keys, so "555-0147", "6125550147" and "(612) 555-0147" all find Helen;
  - any email;
  - its home address, or the site address of any of its jobs, by normalised key and by plain text.
- The same digits fix applies to leads' phone search (audit line 5).
- Each result shows the name, address, phone and status chip. Recents remember contacts.
- What an agent finds depends on question 2.
- Indexes on the keys and on names. ILIKE on text is fine at this size. Add the `pg_trgm` extension (not installed now) only if a company passes about 10,000 contacts or typo matching is wanted (section 7.3).

## 7. Duplicate warnings

The checklist rule: warn, don't block, on a matching phone, email or normalised address, with an "Open existing" link.

### 7.1 Match keys

There is one database function for each key, used by the generated key columns, so the app, the backfill and search always agree.

| Key | Rule | Example |
|---|---|---|
| `phone_key` | Digits only; drop the leading 1 of an 11-digit US number | (612) 555-0147 → `6125550147` |
| `email_key` | Trim and lowercase | Helen.Brooks@Example.com → `helen.brooks@example.com` |
| `address_key` | Lowercase; remove punctuation; shorten street types and directions (street → st, road → rd, lane → ln, court → ct, avenue → ave, drive → dr, north → n …) and unit words (apartment, apt, unit → #); keep house number, street, unit and 5-digit ZIP; with no ZIP, use house number, street and city | "7 Juniper Court, Plymouth, MN 55447" → `7 juniper ct 55447` |

Dropping the city when there is a ZIP means "Saint Paul" and "St Paul" can't create two contacts.

### 7.2 Where and when

- **Where:**
  - the quick-create drawers for lead and contact (checklist Forms line);
  - the job form, where a site address that matches another contact's job is flagged;
  - editing a contact;
  - the public web intake form.
- **When:** on blur of the phone, email and address fields, then again on submit (checklist validation timing). Never on the first keystroke.
- **What the user sees:** a short panel under the field, for example "Matches Helen & Mark Brooks · 7 Juniper Ct · same phone". It has two actions: **Use this contact** (when creating a lead or job) and **Open existing**, which opens in the peek panel so the draft isn't lost. At most 3 matches show. Saving anyway creates the new contact, which then appears in Possible duplicates.
- **Web intake** never attaches a submission to an existing contact on its own, because a public form can't be trusted to pick someone's record. It creates a contact and a lead, and flags the lead "Possible duplicate of Helen & Mark Brooks" with a one-click merge.
- **Scope:** matches are checked across the whole company, even for an agent. Otherwise agents would create duplicates of contacts they can't see. If question 2 keeps contacts scoped, an agent sees only the name and address of a match outside their own work.
- **API:** `GET /api/contacts/matches?phone=&email=&address=&exclude=:id`.

### 7.3 Typos

Exact keys won't catch "Junipr Ct", the one-letter case the research cites from Jobber's community. If duplicates still appear after launch, add typo matching with `pg_trgm` similarity on the address key.

### 7.4 Merge

- **Who:** owners and admins.
- **How:** pick the contact to keep. Its leads, jobs, partner links, extra phones and emails (without repeats), and its own notes and tasks move over. The other contact keeps its row with `merged_into_id`, so its URL forwards.
- **Record:** the merge is written to the history.
- **Confirm:** a merge can't be undone, so it asks first, which the checklist allows only for irreversible actions.

## 8. Homeowner portal link

- **One link per job stays,** per the owner's checklist line. There is no portal for a whole contact: a link that showed a household's every job would show a tenant the landlord's other properties.
- The contact page's **Customer portal** panel lists each job's link status, with Copy link.
- The portal header shows the contact's display name instead of the lead's name, and adds the rep's name (an audit gap).
- **Copy message** lets the user pick the person (Helen or Mark) and uses that person's phone or email.
- **Copying a link again breaks the homeowner's current one,** because only a hash of the token is stored and the link can't be shown twice. Options:
  - **(a) Warn (recommended now).** Keep issuing a new link, but when a live link exists the button says so: "Replaces the link sent Nov 2". Cheap.
  - **(b) Re-copyable links (recommended later).** Store the token encrypted so Copy returns the same link, and add a separate "Reset link" that revokes it. This needs a key kept on the server.
- **Partners don't get the homeowner portal,** because it shows payments. Giving adjusters their own view is out of scope.

## 9. Open questions for the owner

1. **Spouses:** one household contact with two names, phones and emails (recommended), or a separate contact for each person, linked as a household?
2. **Agents:** can they see every contact's name, phone and address (recommended: in a small team anyone may answer a call, and there are fewer duplicates), or only contacts on their own leads and jobs? Leads and jobs stay scoped as today either way.
3. **Contacts list:** Phone as a default column (recommended), or Lifetime value as the checklist's sixth column?
4. **Portal link:** warn that copying replaces the old link (recommended for now), or make links re-copyable?
5. **New work for an existing customer:** does it always start as a lead (recommended, so the Leads board stays the one place sales are tracked), or can staff also create a job straight from the contact (in the overflow menu)?
6. **Contact kinds:** are Homeowner, Adjuster, Property manager, Tenant and Other the right list? Add Realtor? Do you do work for landlords or property managers?
7. **Calls and notes that aren't about one lead or job** (a referral thank-you, a warranty question about an old roof): can they go on the contact itself (recommended), or must staff always pick a lead or job?
8. **Nav position:** after Leads (recommended) or after Jobs?
9. **Address autocomplete** in the create forms (checklist Forms line): is a paid lookup such as Google Places acceptable, and at what monthly budget? Until then addresses are typed and matched by key.
10. **Merging:** owners and admins only (recommended)?

## 10. Rough order of work

Sizes are relative: S is about a day, M two to three days, L about a week.

| # | Step | Size | Needs |
|---|---|---|---|
| 0 | Owner answers section 9 | — | — |
| 1 | Migration 0004: key functions, tables, backfill. Jest: runs twice cleanly, counts match, keys match the examples in 7.1 | M | Q1, Q6 |
| 2 | Contacts service and API (list, get, create, update, matches, history feed) with the visibility rule. Switch the read sites in 4.3 with unchanged field names. `createLead`, `createJob` and intake set `contact_id` | L | 1, Q2, Q7 |
| 3 | Search: Contacts group, digit phone matching (leads too), full-name match | S | 2 |
| 4 | Run `ui-consistency:finding-patterns` for the Contacts list and record page, so each page has its checklist from `crm-ux-checklist.md` and the Leads and Jobs pages before any UI task is handed out | S | — |
| 5 | Nav item, icon, `g c`, saved-order insertion, Create menu, peek and pin kinds | S | 4, Q8 |
| 6 | `/contacts` list | M | 2, 4, `RecordTable` fixes, Q3 |
| 7 | `/contacts/[id]` record page: header, Up next, history, rail, portal panel | L | 2, 4, Q4 |
| 8 | Lead and job pages: contact links, job header address, contact picker in the job form, lead edit writes to the contact | M | 7 |
| 9 | Quick-create drawers (lead, contact) with duplicate warnings; intake flag | M | 2, quick-create drawer (audit line 25), Q9 |
| 10 | Migration 0005: `contact_id` required | S | 8 and 9 released |
| 11 | Households and partners: extra phones and emails, `job_contacts`, adjuster pick in the insurance group | M | 7, insurance field group |
| 12 | Possible duplicates list and merge | M | 9, Q10 |
| 13 | Check each page with `ui-consistency:verifying`, run the QA harness on `crm_qa`, and test on a phone at 375 px | S per page | each UI step |

**Shared with other planned work:** the Jobs board, the `RecordTable` fixes, the quick-create drawer, the insurance field group, and the portal fixes (staff controls on public pages, rep name). Agree the order with those plans so `RecordTable` and the drawer are built once.

**Out of scope:** Property records, marketing campaigns, CSV import of contacts (the research cites JobNimbus imports creating duplicates, so import would need the same match keys), storing QuickBooks customer ids on contacts, and an adjuster portal.

## 11. Risks

- **A read site still shows the lead's old name or phone.** Mitigation: the API keeps its field names and reads them from the contact, and the lead's own columns are labelled "as submitted" wherever they still appear.
- **A wrong merge.** Mitigation: nothing merges automatically, only owners and admins merge, the merged contact's row stays with `merged_into_id`, and the merge is in the history.
- **Agents see more than before** (if question 2 is yes). It covers contact details only; leads, jobs and money keep today's scoping.
- **The history feed is slow** because it reads six tables. It is fine at today's size, and it loads 50 entries at a time.
