---
"wrangler": patch
---

fix: ensure `console.log()`s during startup are displayed

Previously, whenever Wrangler connected to the V8 inspector, it would clear V8's
internal buffer of log messages. This ensured only messages logged while the
inspector was connected would be displayed. Unfortunately, we only connect to
the inspector once the Worker has reported it's ready to receive connections.
This meant any `console.log()`s during Worker startup wouldn't be displayed.

This change switches to clearing V8's buffer whenever we _disconnect_ from the
inspector instead, ensuring startup logs are shown. In particular, this should
[fix Remix's HMR](https://github.com/remix-run/remix/issues/7616), which relies
on startup logs to know when the Worker is ready.
