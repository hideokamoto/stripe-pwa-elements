---
'stripe-pwa-elements': patch
---

Fix the section heading above the postal code field in `<stripe-card-element>`: it read "Country or region" ("地域" in Japanese) even though the component only collects a postal code and has no country selector. It now reads "Postal Code" ("郵便番号"), and the unused `Country or region` translations were removed.
