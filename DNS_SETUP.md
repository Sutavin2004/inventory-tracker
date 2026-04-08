# GoDaddy DNS Setup for edepot.ca → Railway

## Step 1: Get your Railway domain

In the Railway dashboard, open your project → Settings → Networking → add a custom domain.
Railway will show you either:
- An **IP address** (use an A record), or
- A **CNAME target** like `<something>.up.railway.app` (use a CNAME record)

## Step 2: Log in to GoDaddy

Go to https://dcc.godaddy.com/manage/dns → select **edepot.ca** → Manage DNS.

## Step 3: Add DNS records

### Root domain (edepot.ca)
If Railway gives you an **IP address**:
| Type | Name | Value              | TTL  |
|------|------|--------------------|------|
| A    | @    | `<Railway IP>`     | 600  |

If Railway gives you a **CNAME target** (use ALIAS/ANAME at GoDaddy, which calls it "ALIAS"):
| Type  | Name | Value                        | TTL  |
|-------|------|------------------------------|------|
| CNAME | @    | `<something>.up.railway.app` | 600  |

> GoDaddy supports CNAME at root via their "ALIAS" record type — select CNAME and set Name to `@`.

### www subdomain (www.edepot.ca)
| Type  | Name | Value                        | TTL  |
|-------|------|------------------------------|------|
| CNAME | www  | `<something>.up.railway.app` | 600  |

## Step 4: Verify in Railway

Railway will auto-provision a TLS certificate once DNS propagates (usually 5–30 minutes,
up to 48 hours worst case). Check the custom domain status in Railway Settings → Networking.

## Step 5: Set Railway environment variables

In Railway → your service → Variables, add:
```
NODE_ENV=production
JWT_SECRET=<a long random string>
```

Railway auto-injects `PORT`, so you do not need to set that manually.
