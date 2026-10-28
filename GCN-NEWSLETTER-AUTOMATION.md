# GCN Thursday newsletter automation

Updated 2026-10-28

A scheduled job pulls the past week's Top Stories from the GCN WordPress site and saves a draft Mailchimp campaign every Thursday morning, ready for Mitch to review and send.

## Scope and decisions

Mitch wants the Thursday GCN newsletter to build itself from the site's top stories. We are going with the WordPress REST API plus the Mailchimp API, saving a draft for Mitch rather than sending automatically.

| Topic | Decision | Status |
| --- | --- | --- |
| Source | GCN WordPress site, category `top-stories` (2,149 posts, never cleaned up, new stories tagged every week) | Confirmed from the admin screenshots |
| Selection | Posts in `top-stories` published in the last 7 days, newest first, capped | Cap and ordering to confirm with Mitch |
| Delivery | Draft Mailchimp campaign plus a test email to Mitch; no auto-send in version 1 | Proposed in the email to Mitch |
| Platform | Stay on Mailchimp | Mitch is open to alternatives, but GCN comes first |
| Edition posts | "The October 27 edition is now ready to read online" is also tagged Top Stories and should be left out | Method to confirm (see open questions) |
| Out of scope | Monday GCN and Tuesday Sentinel cover sends; a Sentinel Thursday email | Later. Keep config per site so the Sentinel can be added |

## How it runs

One scheduled function does the whole job. Each Thursday morning it:

1. Starts from Cloud Scheduler at the client's local time (probably Australia/Brisbane, to confirm).
2. Reads the `top-stories` category ID from config (looked up once from `/wp-json/wp/v2/categories?slug=top-stories`).
3. Requests posts in that category published after now minus 7 days, newest first, with the featured image embedded.
4. Drops the edition post and anything without a usable title or link, then trims to the story cap.
5. Stops if no stories remain: logs it and notifies Chad. It never creates an empty campaign.
6. Renders the newsletter HTML (title, image, short excerpt and link per story, plus the Mailchimp footer tags).
7. Creates a regular campaign in Mailchimp with the audience, subject line, from name and reply-to.
8. Sets the campaign content to the rendered HTML.
9. Sends a test email to Mitch, which doubles as the "draft is ready" notice. The campaign stays unsent.
10. Writes a run record to Firestore (date, post IDs, campaign ID, status) so a retry cannot create a second draft.

Mitch then reviews the draft in Mailchimp and sends it himself.

## WordPress query

One request returns everything the newsletter needs, including the featured image:

```http
GET https://<gcn-domain>/wp-json/wp/v2/posts
  ?categories=<top-stories id>
  &after=<now minus 7 days, ISO 8601>
  &per_page=12
  &orderby=date&order=desc
  &_embed=wp:featuredmedia
  &_fields=id,date,link,title,excerpt,author,categories,featured_media,_links,_embedded
```

| Parameter | Use | Note |
| --- | --- | --- |
| `categories` | ID of `top-stories` | Look up by slug once and store in config |
| `after` | Start of the window | Must be ISO 8601. The docs do not say which timezone it uses, so test it (see checklist) |
| `per_page` | Fetch the story cap plus a few spares | Default is 10. Spares cover edition posts removed afterwards |
| `orderby` / `order` | `date` / `desc` | Both are the defaults |
| `categories_exclude`, `author_exclude` | Optional way to drop the edition post | Only safe if the edition posts have their own category or author that other stories never share |
| `_embed` | Adds the featured image under `_embedded` | `_embed` accepts a list of relations since WordPress 5.4. Confirm `wp:featuredmedia` on a live response |
| `_fields` | Trims the payload | When combined with `_embed`, include `_links` and `_embedded` in the list |

Fields to map into a `Story` type: `title.rendered` (decode HTML entities), `excerpt.rendered` (strip tags and any "read more" text), `link`, `date`, and the image URL from `_embedded["wp:featuredmedia"][0]` (`source_url`, or a smaller size from `media_details.sizes`).

Before building, confirm the endpoint answers without login. Some WordPress security plugins or firewalls block `/wp-json/` for anonymous requests.

## Mailchimp campaign

Three calls create a ready-to-review draft. The job never calls the send action in version 1.

| Step | Request | Body | Note |
| --- | --- | --- | --- |
| 1. Create | `POST /3.0/campaigns` | `type: "regular"`, `recipients.list_id`, `settings` (`subject_line`, `preview_text`, `title`, `from_name`, `reply_to`) | Only `type` is required to create, but `reply_to` is required before the campaign can be sent |
| 2. Set content | `PUT /3.0/campaigns/{id}/content` | `html` | `plain_text` is generated automatically if omitted |
| 3. Test | `POST /3.0/campaigns/{id}/actions/test` | `send_type: "html"`, `test_emails: [...]` | Returns 204 with an empty body |

Authentication is an `Authorization: Bearer <API key>` header. The docs show the host as `api.mailchimp.com`; real calls use the data-centre host from the API key's suffix (for example `us21.api.mailchimp.com`).

Implementation notes:

- Use plain `fetch` behind a small typed client rather than the Mailchimp SDK, so the three calls and their errors are typed in our own code.
- Put the footer merge tags `*|UNSUB|*` and `*|LIST:ADDRESS|*` in the HTML, then check the test email shows a working unsubscribe link.
- Email HTML needs table layout and inline styles. Start with a typed template function. React Email (which has a Tailwind component) is an option if the layout grows.
- Name the campaign with the send date, for example `GCN Thursday 2026-10-29`, so drafts are easy to find.

## Project setup

The job runs as a Firebase scheduled function written in TypeScript, so it sits with the rest of the client's Firebase setup.

| Concern | Choice |
| --- | --- |
| Runtime | Cloud Functions for Firebase (2nd gen), `onSchedule` from `firebase-functions/v2/scheduler`, TypeScript in strict mode |
| Schedule | Cron `0 7 * * 4` (Thursday 07:00) with `timeZone` set to the client's zone, plus a retry count for transient failures |
| Secrets | `MAILCHIMP_API_KEY` stored as a Firebase secret and bound to the function. Never committed |
| Config | One typed entry per site in `sites.ts`: base URL, category slug, audience ID, from name, reply-to, test recipients, story cap, lookback days |
| State | Firestore collection `newsletter-runs`, one document per site and send date, used as the duplicate guard |
| Cost | Cloud Scheduler is $0.10 per job per month after three free jobs per Google account. The project also needs the Cloud Scheduler API enabled |

Suggested layout (kebab-case file names):

```text
functions/src/
  index.ts                     exports the scheduled function
  config/
    sites.ts                   per-site settings (gcn now, sentinel later)
  lib/
    wordpress-client.ts        fetch posts, map to Story
    select-stories.ts          exclude edition posts, order, cap
    html-utils.ts              decode entities, strip tags, trim excerpts
    render-newsletter.ts       Story[] to email HTML
    mailchimp-client.ts        create campaign, set content, send test
    run-log.ts                 Firestore duplicate guard and status
  templates/
    gcn-thursday.ts            email template
  types/
    story.ts
    mailchimp.ts
scripts/
  dry-run.ts                   runs steps 1 to 6, writes HTML to disk, no Mailchimp call
```

## Build checklist

Work through these in order. The first three need no code and settle the biggest unknowns.

- [ ] Confirm the GCN `/wp-json/wp/v2/posts` endpoint answers without login
- [ ] Look up the `top-stories` category ID and store it in config
- [ ] Test the `after` filter with a post near the 7-day boundary to learn which timezone it uses
- [ ] Scaffold the Firebase functions project (TypeScript strict, kebab-case files)
- [ ] Typed WordPress client that maps responses to a `Story` type, including the embedded featured image
- [ ] Story selection: exclude edition posts, order, cap, remove duplicates
- [ ] HTML helpers: decode entities, strip tags, trim excerpts
- [ ] Email template matching Mitch's current Thursday newsletter (needs a sample)
- [ ] Dry-run script that writes the HTML to disk for viewing and email-client previews
- [ ] Typed Mailchimp client: create campaign, set content, send test
- [ ] Firestore run log as a duplicate guard
- [ ] Failure handling: no stories, WordPress down, Mailchimp error. Each logs and notifies Chad
- [ ] Scheduled function with secret, timezone and retries, deployed to a staging project if one exists
- [ ] First live run against Mitch's real audience as a draft with a test email only, and Mitch signs off the layout
- [ ] Short runbook: how to rerun, change the story cap, rotate the API key
- [ ] After a few clean weeks, discuss auto-send and a Sentinel version

## Open questions

The first three are in the email to Mitch. The rest can be answered by checking the site or the accounts.

| Question | Why it matters | Ask |
| --- | --- | --- |
| How many stories per newsletter? (suggested 5 to 8) | Sets the story cap | Mitch |
| Lead story at the top, or newest first? | Decides whether a second tag or category is needed | Mitch |
| A recent Thursday newsletter to match | Layout and tone of the template | Mitch |
| How do we recognise the edition post: author, title pattern or its own category? | The Oct 27 edition post is tagged Top Stories and by Sharon King, who may also write normal stories | Mitch, then check the admin |
| Last 7 days, or since the Monday edition? | Sets the lookback window | Mitch |
| Send time and the client's timezone (likely Australia/Brisbane) | Schedule and `after` boundary | Mitch |
| Audience ID, from name, reply-to, subject line pattern, who gets the test email | Campaign settings | Mitch |
| Who creates the Mailchimp API key, and on which account? | Needed for the secret | Mitch and Chad |
| Do posts reliably have a featured image and an excerpt? | Newsletter looks flat without them | Check in the admin |
| Is the REST API open to anonymous requests? | Blocks the whole approach if not | Check with a request |
| Which Firebase project hosts the function, and who pays for it? | Billing, secrets and deploy access | Chad |

## Sources

Checked on 2026-10-28:

- [WordPress REST API: global parameters](https://developer.wordpress.org/rest-api/using-the-rest-api/global-parameters/) for `_embed` and `_fields`
- [WordPress REST API: posts reference](https://developer.wordpress.org/rest-api/reference/posts/) for the list arguments
- [Mailchimp: add campaign](https://mailchimp.com/developer/marketing/api/campaigns/create.md)
- [Mailchimp: set campaign content](https://mailchimp.com/developer/marketing/api/campaigns/upsert-content.md)
- [Mailchimp: send test email](https://mailchimp.com/developer/marketing/api/campaigns/create-action-test.md)
- [Firebase: schedule functions](https://firebase.google.com/docs/functions/schedule-functions) for the scheduler, billing and services
- The two GCN WordPress admin screenshots Chad supplied, for the category and post details

Not confirmed in those pages, so check while building: the `timeZone`, `retryCount` and `secrets` options on `onSchedule`; the Mailchimp data-centre host and footer merge tags; whether the `after` argument uses site time or UTC; and `_embed=wp:featuredmedia` on the live site.
