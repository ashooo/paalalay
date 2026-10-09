# Nearby hospitals and clinics

The **Care** tab replaces the database-backed doctor directory in navigation.
It opens Google Maps searches for hospitals or clinics near the selected location.
Results, hours, directions and contact information are provided by Google Maps;
Paalalay does not label these as independently verified medical providers.

Location is requested only after **Use location and open Maps** is tapped. Only
foreground location is requested; there is no tracking or background permission.
Coordinates are rounded to three decimal places before sharing with Google Maps
and are never written to SQLite, logs or chat. Users can instead enter a city or
area without granting location permission. Both searches require internet.

No API key, billing account, doctor seeding or migration is needed. The existing
doctor service/contracts remain available for later curated data work.

The implementation follows the SDK 57 [Expo Location documentation](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
and [Google Maps categorical search URLs](https://developers.google.com/maps/documentation/urls/get-started).
The new `expo-location` module needs one rebuilt native development app. Reload
is sufficient for later UI-only changes.

Device checks: granted/denied permission, location services disabled, slow GPS,
Google Maps installed/uninstalled, hospital and clinic results, manual city
search, and returning to Paalalay. Browser checks should not share the developer's
actual location; test manual validation or inject synthetic coordinates.
