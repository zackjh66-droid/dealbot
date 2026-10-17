# Project Zero

Xbox Dev Mode launcher and account-linking project targeting an authorized Fortnite Season 7.00 (CL-4629139) client for compatibility research.

## Initial milestone

1. Xbox x64 UWP launcher boots.
2. Launcher requests a short-lived Project Zero device code.
3. User claims the code on the Project Zero website and creates/signs into a Project Zero account.
4. Xbox receives an opaque launcher session after linking completes.
5. Client bridge validates a locally supplied authorized Season 7.00 installation and attempts the compatibility/bootstrap path.
6. Initial target ends at the real client lobby; matchmaking/game servers are not part of this milestone.

Fortnite/Epic binaries and assets are intentionally not stored in this repository.
