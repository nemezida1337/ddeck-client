# Mobile layer sources

`plugin/lib/mobile/skin.js` is generated. Edit these ordered parts instead:

- `00-prelude.js` — translations, constants, IIFE opening
- `01-state.js` — shared state/helpers
- `02-drawer.js` — native drawer and session picking
- `03-focus.js`, `04-search-focus.js` — keyboard/focus guards
- `05-navigation.js` — back navigation
- `06-theme.js` — theme and workspace
- `07-watch.js` — page observer/ticker
- `08-bridge.js` — native bridge
- `09-composer.js`, `10-question.js` — composer/agent question
- `11-desktop-hide.js`, `12-second-phone.js` — legacy hiding and second phone
- `13-bottom-nav.js` — custom sidebar bottom navigation
- `14-settings.js` — mobile settings adaptation
- `15-start.js` — bootstrap

Build and check:

```bash
npm run mobile:build
npm run skin:check
```

CSS follows the same rule: `plugin/lib/mobile/src-css/*.css` in sorted order generates
`plugin/lib/mobile/skin.css`. Edit sections, never the generated file.
