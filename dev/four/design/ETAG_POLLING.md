# ETag-Based Polling in htmx

## Overview

htmx automatically supports HTTP ETags for efficient polling. When a server sends an `ETag` header, htmx stores it and includes `If-None-Match` in subsequent requests, allowing servers to return `304 Not Modified` when content hasn't changed.

## How It Works

### Basic Flow

```html
<div hx-get="/notifications" hx-trigger="every 2s">
  <!-- Notifications appear here -->
</div>
```

**First Request:**
```http
GET /notifications HTTP/1.1
HX-Request: true
```

**Server Response:**
```http
HTTP/1.1 200 OK
ETag: "abc123"
Cache-Control: no-store

<div>3 new messages</div>
```

**Subsequent Requests (every 2s):**
```http
GET /notifications HTTP/1.1
HX-Request: true
If-None-Match: "abc123"
Cache-Control: no-store
```

**Server Response (no changes):**
```http
HTTP/1.1 304 Not Modified
ETag: "abc123"
Cache-Control: no-store
```

**Server Response (content changed):**
```http
HTTP/1.1 200 OK
ETag: "xyz789"
Cache-Control: no-store

<div>5 new messages</div>
```

### Client Behavior

- htmx stores the `ETag` from responses on the element
- On subsequent requests, htmx sends `If-None-Match: <stored-etag>`
- On `304 Not Modified`, htmx skips the swap (keeps existing content)
- On `200 OK`, htmx updates the stored ETag and swaps content

## When to Use ETags

### ✅ Good Use Cases

1. **Frequent Polling (< 5s intervals)**
   - Chat notifications
   - Live dashboards
   - Stock tickers
   - Status monitors

2. **Data That Changes Infrequently**
   - Most polls return unchanged data
   - Server can quickly determine if data changed
   - Example: 90% of polls return 304

3. **Expensive Server Operations**
   - Complex database queries
   - Template rendering
   - API aggregation
   - Heavy computations

4. **High Traffic Endpoints**
   - Many users polling simultaneously
   - Server load is a concern
   - Bandwidth costs matter

### ❌ When NOT to Use ETags

1. **Data Always Changes**
   - Real-time sensor data
   - Continuous streams
   - Use SSE instead

2. **Cheap to Generate**
   - Static content
   - Simple queries faster than ETag check
   - Overhead not worth it

3. **User-Specific Data**
   - Can't share ETags across users
   - Each user needs separate ETag tracking

## Server Implementation

### Simple Example (Python/Flask)

```python
from flask import Flask, request, Response
import hashlib

app = Flask(__name__)

@app.route('/notifications')
def get_notifications():
    # Quick check: generate ETag from latest data version
    latest_id = db.query("SELECT MAX(id) FROM notifications WHERE user_id = ?", user_id)
    current_etag = f'"{latest_id}"'
    
    # Check if client has current version
    client_etag = request.headers.get('If-None-Match')
    if client_etag == current_etag:
        return Response(status=304, headers={
            'ETag': current_etag,
            'Cache-Control': 'no-store'
        })
    
    # Client needs update - do expensive work
    notifications = db.query("SELECT * FROM notifications WHERE user_id = ?", user_id)
    html = render_template('notifications.html', notifications=notifications)
    
    return Response(html, headers={
        'ETag': current_etag,
        'Cache-Control': 'no-store'
    })
```

### ETag Generation Strategies

#### 1. **Version/ID Based** (Fastest)
```python
# Use latest record ID or version number
etag = f'"{max_id}"'
etag = f'"{version_number}"'
```

#### 2. **Timestamp Based**
```python
# Use last modification time
etag = f'"{last_updated.timestamp()}"'
```

#### 3. **Hash Based** (Most Accurate)
```python
# Hash the actual content
content_hash = hashlib.md5(data.encode()).hexdigest()
etag = f'"{content_hash}"'
```

#### 4. **Composite**
```python
# Combine multiple factors
etag = f'"{user.updated_at}-{notification_count}-{last_message_id}"'
```

### Performance Comparison

| Scenario | Without ETag | With ETag (304) |
|----------|--------------|-----------------|
| Database queries | 3-5 queries | 1 query |
| Template rendering | Full render | None |
| Response size | 5KB | 100 bytes |
| Server CPU | High | Minimal |
| Response time | 50-200ms | 5-10ms |

## Caching Considerations

### The Problem

ETags are designed for caching, but polling needs fresh data. We must prevent intermediate caches (browsers, CDNs, proxies) from serving stale responses.

### The Solution

htmx automatically sends `Cache-Control: no-store` when using ETags:

```http
GET /notifications
If-None-Match: "abc123"
Cache-Control: no-store
```

This tells intermediaries:
- Don't cache this response
- Always forward to origin server
- But still use ETag for conditional requests

### Server Must Also Send Cache-Control

```python
return Response(html, headers={
    'ETag': current_etag,
    'Cache-Control': 'no-store'  # Critical!
})
```

### What Happens Without Cache-Control

```
Browser → CDN → Server
         ↑
         └─ CDN caches 304 response
         
Next request:
Browser → CDN (returns cached 304, never hits server!)
```

### With Cache-Control: no-store

```
Browser → CDN → Server (always forwarded)
```

## Potential Issues & Solutions

### Issue 1: Stale ETags After Page Reload

**Problem:** Element stores ETag, user reloads page, old ETag persists in memory.

**Solution:** ETags are stored on DOM elements, cleared on page reload automatically.

### Issue 2: Multiple Elements, Same Endpoint

**Problem:** Two elements poll same endpoint, each stores different ETag.

**Example:**
```html
<div id="header-notif" hx-get="/notifications" hx-trigger="every 5s"></div>
<div id="sidebar-notif" hx-get="/notifications" hx-trigger="every 5s"></div>
```

**Solution:** Each element independently tracks its ETag. This is correct behavior - they may have different content due to `hx-select` or timing.

### Issue 3: ETag Mismatch After Server Restart

**Problem:** Server restarts, generates new ETags, all clients get 200 instead of 304.

**Solution:** This is expected and correct. Clients update to new ETag on next poll.

### Issue 4: Clock Skew with Timestamp ETags

**Problem:** Using timestamps across multiple servers with unsynchronized clocks.

**Solution:** Use version numbers or hashes instead of timestamps, or sync server clocks with NTP.

### Issue 5: User-Specific Content

**Problem:** ETag must be unique per user, can't be shared.

**Example:**
```python
# Wrong - same ETag for all users
etag = f'"{latest_message_id}"'

# Right - user-specific ETag
etag = f'"{user_id}-{latest_message_id}"'
```

### Issue 6: Partial Updates

**Problem:** Content has multiple parts, only one changed.

**Solution:** Use multiple polling elements with different endpoints:
```html
<div hx-get="/notifications/messages" hx-trigger="every 2s"></div>
<div hx-get="/notifications/alerts" hx-trigger="every 5s"></div>
```

## Best Practices

### 1. Keep ETag Generation Cheap

```python
# Good - single indexed query
etag = f'"{db.query("SELECT MAX(id) FROM messages")}"'

# Bad - expensive computation
etag = hashlib.md5(render_full_page().encode()).hexdigest()
```

### 2. Always Include Cache-Control

```python
headers = {
    'ETag': etag,
    'Cache-Control': 'no-store'  # Required!
}
```

### 3. Use Appropriate Poll Intervals

```html
<!-- Fast changing data -->
<div hx-get="/live-feed" hx-trigger="every 1s"></div>

<!-- Slow changing data -->
<div hx-get="/daily-stats" hx-trigger="every 30s"></div>
```

### 4. Monitor 304 Rate

Track the ratio of 304 to 200 responses:
- High 304 rate (>70%) = ETags working well
- Low 304 rate (<30%) = Data changes too frequently, consider SSE

### 5. Combine with Other Optimizations

```html
<!-- Only poll when tab is visible -->
<div hx-get="/notifications" 
     hx-trigger="every 5s[!document.hidden]">
</div>
```

## Comparison with Alternatives

### vs. Server-Sent Events (SSE)

**ETags:**
- ✅ Simpler server implementation
- ✅ Stateless (no persistent connections)
- ✅ Works through all proxies/firewalls
- ❌ Higher latency (poll interval)
- ❌ More requests (even with 304s)

**SSE:**
- ✅ Instant updates (no polling delay)
- ✅ Fewer requests
- ❌ Persistent connections (server state)
- ❌ Connection management complexity
- ❌ Some proxies/firewalls block

**Use ETags when:** Simplicity matters, updates can wait 1-5 seconds  
**Use SSE when:** Need instant updates, have infrastructure for persistent connections

### vs. WebSockets

**ETags:**
- ✅ Much simpler
- ✅ Standard HTTP
- ✅ No special server support

**WebSockets:**
- ✅ Bidirectional
- ✅ Lower latency
- ❌ Complex infrastructure

**Use ETags when:** One-way updates, standard HTTP stack  
**Use WebSockets when:** Need bidirectional real-time communication

### vs. Long Polling

**ETags:**
- ✅ Simpler server code
- ✅ Predictable load
- ❌ Fixed delay

**Long Polling:**
- ✅ Instant updates
- ❌ Held connections
- ❌ Complex timeout handling

## Real-World Examples

### Example 1: Notification Badge

```html
<span hx-get="/notification-count" 
      hx-trigger="every 10s"
      hx-swap="innerHTML">
  3
</span>
```

```python
@app.route('/notification-count')
def notification_count():
    count = get_unread_count(user_id)
    etag = f'"{count}"'
    
    if request.headers.get('If-None-Match') == etag:
        return '', 304, {'ETag': etag, 'Cache-Control': 'no-store'}
    
    return f'{count}', 200, {'ETag': etag, 'Cache-Control': 'no-store'}
```

### Example 2: Live Dashboard

```html
<div hx-get="/dashboard/stats" 
     hx-trigger="every 5s"
     hx-swap="innerHTML">
  <!-- Stats here -->
</div>
```

```python
@app.route('/dashboard/stats')
def dashboard_stats():
    # ETag from last stats update time
    last_update = cache.get('stats:last_update')
    etag = f'"{last_update}"'
    
    if request.headers.get('If-None-Match') == etag:
        return '', 304, {'ETag': etag, 'Cache-Control': 'no-store'}
    
    stats = calculate_stats()  # Expensive!
    html = render_template('stats.html', stats=stats)
    return html, 200, {'ETag': etag, 'Cache-Control': 'no-store'}
```

### Example 3: Status Monitor

```html
<div hx-get="/server-status" 
     hx-trigger="every 3s"
     class="status-indicator">
  Online
</div>
```

```python
@app.route('/server-status')
def server_status():
    status = check_server_status()
    etag = f'"{status.state}-{status.last_change}"'
    
    if request.headers.get('If-None-Match') == etag:
        return '', 304, {'ETag': etag, 'Cache-Control': 'no-store'}
    
    return render_status(status), 200, {'ETag': etag, 'Cache-Control': 'no-store'}
```

## Conclusion

ETag-based polling in htmx provides an efficient middle ground between simple polling and complex real-time solutions. It's:

- **Automatic** - works transparently when servers send ETags
- **Standard** - uses HTTP ETags and conditional requests
- **Efficient** - reduces server load and bandwidth
- **Simple** - minimal code on both client and server

Use it for frequent polling where data changes infrequently and you want to reduce server load without the complexity of persistent connections.
