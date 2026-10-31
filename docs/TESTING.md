# Validation notes

Custom CSS was syntax-checked. JavaScript was checked with node --check.

Isolated Chromium fixtures checked: collapsed/expanded search; icon navigation and tooltips; account/card button state; delegation to native Play/Install; disabled action handling; native Links menu layout and anchor handling; empty Activity filtering; sidebar sizing; compact menu/dialog rules; compact login sizes; GIF loading and transparent rendering.

These are isolated checks, not a claim that every Steam state or route has been live-tested. User screenshots informed iterative layout corrections. Known maintenance dependencies include Steam class names, native window titles, and React event props used by the card's Links button. Account names and wallet values remain in Steam's DOM even when visually collapsed.
